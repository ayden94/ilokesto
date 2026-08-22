import { spawnSync } from 'node:child_process';
import { accessSync, constants, lstatSync, realpathSync } from 'node:fs';
import { lstat, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const controlCharacters = /[\u0000-\u001f\u007f]/u;
const worktreeRelativePath = /^\.worktrees\/issue-[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const sandboxExecutable = '/usr/bin/sandbox-exec';
const gitExecutable = '/usr/bin/git';
const sandboxReadGrants = new WeakMap();
const trustedGitEnvironment = Object.freeze({
  HOME: userInfo().homedir,
  LANG: 'C',
  LC_ALL: 'C',
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
});

export class CapabilityBoundaryError extends Error {
  name = 'CapabilityBoundaryError';

  constructor(message) {
    super(message);
  }
}

export function assertSafeText(value, label) {
  if (typeof value !== 'string' || value.length === 0 || controlCharacters.test(value)) {
    throw new CapabilityBoundaryError(`${label} is invalid`);
  }
  return value;
}

export function runFile(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env,
    shell: false,
    stdio: options.stdio ?? 'pipe',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new CapabilityBoundaryError(`${command} failed (${String(result.status ?? result.signal)}): ${String(result.stderr).trim()}`);
  }
  return String(result.stdout).trim();
}

export function runGitFile(args, options = {}) {
  return runFile(gitExecutable, args, {
    ...options,
    env: { ...trustedGitEnvironment, ...(options.internalGitEnvironment ?? {}) },
  });
}

function sandboxLiteral(path) {
  return JSON.stringify(realpathSync(path));
}

function sandboxReadFilter(path) {
  const canonical = realpathSync(path);
  return lstatSync(canonical).isDirectory()
    ? `(subpath ${JSON.stringify(canonical)})`
    : `(literal ${JSON.stringify(canonical)})`;
}

async function canonicalTrustedPath(trustedRoot, path) {
  const canonical = await realpath(resolve(trustedRoot, path));
  const fromRoot = relative(trustedRoot, canonical);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new CapabilityBoundaryError('trusted verifier read path is outside the trusted root');
  }
  return canonical;
}

async function dependencyStorePath(trustedRoot) {
  const modules = await readFile(join(trustedRoot, 'node_modules', '.modules.yaml'), 'utf8');
  const store = /^storeDir: (.+)$/mu.exec(modules)?.[1];
  if (!store || !isAbsolute(store)) throw new CapabilityBoundaryError('pnpm dependency store is unavailable');
  return realpath(store);
}

export async function createVerifierReadGrant(trustedRoot, executables, plan) {
  const canonicalRoot = await realpath(trustedRoot);
  const planPackages = [...new Set(plan.map((step) => assertSafeText(step.packageName, 'package')))].sort();
  const paths = [
    await canonicalTrustedPath(canonicalRoot, 'node_modules'),
    await canonicalTrustedPath(canonicalRoot, 'package.json'),
    await dependencyStorePath(canonicalRoot),
    await realpath(dirname(executables.pnpm)),
    ...await Promise.all(Object.values(executables).map((path) => realpath(path))),
    ...await Promise.all(planPackages.map((packageName) => canonicalTrustedPath(
      canonicalRoot,
      `packages/${packageName}/node_modules`,
    ))),
  ];
  for (const step of plan) {
    if (step.config) {
      paths.push(await canonicalTrustedPath(canonicalRoot, `packages/${step.packageName}/${step.config}`));
      paths.push(await canonicalTrustedPath(canonicalRoot, `packages/${step.packageName}/package.json`));
    }
  }
  if (plan.some((step) => step.operation === 'spawn' && step.command === 'pnpm' && step.args.includes('playwright'))) {
    paths.push(await realpath(join(userInfo().homedir, 'Library', 'Caches', 'ms-playwright')));
  }
  const grant = Object.freeze({});
  sandboxReadGrants.set(grant, Object.freeze([...new Set(paths)]));
  return grant;
}

function sandboxReadPolicy(command, options) {
  const systemReadPaths = [
    '/System/Library/CoreServices/SystemVersion.plist',
    '/System/Library/Frameworks/CoreFoundation.framework',
    '/System/Library/Frameworks/Security.framework',
    '/System/Library/OpenSSL/openssl.cnf',
    '/bin/sh',
    '/usr/bin/dirname',
    '/usr/bin/env',
    '/usr/bin/sed',
    '/usr/bin/tar',
    '/usr/bin/uname',
    '/usr/lib/dyld',
    '/usr/share/locale',
    '/private/var/db/timezone',
    '/dev/null',
    '/dev/random',
    '/dev/urandom',
  ];
  if (Object.hasOwn(options, 'readPaths')) {
    throw new CapabilityBoundaryError('raw sandbox read paths are forbidden');
  }
  const grantedPaths = sandboxReadGrants.get(options.readGrant);
  if (!grantedPaths) throw new CapabilityBoundaryError('verifier read grant is invalid');
  const readPaths = [command, options.worktreePath, ...grantedPaths, ...systemReadPaths];
  const filters = [...new Set(readPaths.map(sandboxReadFilter))];
  return `(allow file-read-data (regex #"^/$") ${filters.join(' ')})`;
}

export function createSandboxPolicy(command, options) {
  return [
    '(version 1)',
    '(deny default)',
    '(allow process*)',
    '(allow signal (target same-sandbox))',
    '(allow file-read-metadata)',
    sandboxReadPolicy(command, options),
    '(allow sysctl-read)',
    '(allow mach-lookup)',
    '(allow network-bind (local ip "localhost:*"))',
    '(allow network-outbound (remote ip "localhost:*"))',
    `(allow file-write* (subpath ${sandboxLiteral(options.worktreePath)}) (literal "/dev/null"))`,
  ].join(' ');
}

export function runSandboxedFile(command, args, options) {
  if (process.platform !== 'darwin') {
    throw new CapabilityBoundaryError('verifier sandbox is unavailable: unsupported platform');
  }
  try {
    accessSync(sandboxExecutable, constants.X_OK);
  } catch {
    throw new CapabilityBoundaryError('verifier sandbox is unavailable: sandbox-exec is not executable');
  }
  const policy = createSandboxPolicy(command, options);
  return runFile(sandboxExecutable, ['-p', policy, command, ...args], options);
}

export function discoverRepositoryRoot(cwd = process.cwd()) {
  return runGitFile(['rev-parse', '--show-toplevel'], { cwd });
}

export function discoverRegisteredWorktrees(repositoryRoot) {
  const output = runGitFile(['-C', repositoryRoot, 'worktree', 'list', '--porcelain']);
  return output
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length));
}

export async function discoverGitCommonDirectory(worktreePath) {
  const gitDirectory = runGitFile(['rev-parse', '--git-common-dir'], { cwd: worktreePath });
  return realpath(resolve(worktreePath, gitDirectory));
}

export async function discoverGitDirectory(worktreePath) {
  const gitDirectory = runGitFile(['rev-parse', '--git-dir'], { cwd: worktreePath });
  return realpath(resolve(worktreePath, gitDirectory));
}

export async function withMutationLock(worktreePath, operation) {
  const [commonDirectory, gitDirectory] = await Promise.all([
    discoverGitCommonDirectory(worktreePath),
    discoverGitDirectory(worktreePath),
  ]);
  const lockPath = join(commonDirectory, 'ilokesto-implementer-mutation.lock');
  try {
    await mkdir(lockPath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      throw new CapabilityBoundaryError('VCS mutation lock is busy');
    }
    throw error;
  }
  try {
    return await operation({ commonDirectory, gitDirectory });
  } finally {
    await rm(lockPath, { recursive: true });
  }
}

async function rejectSymlinkSegments(root, target) {
  const pathFromRoot = relative(root, target);
  if (pathFromRoot === '' || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new CapabilityBoundaryError('path is outside the trusted root');
  }
  let current = root;
  for (const segment of pathFromRoot.split(sep)) {
    current = join(current, segment);
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new CapabilityBoundaryError('symlink paths are forbidden');
  }
}

export async function validateAssignedWorktree(input) {
  const repositoryRoot = await realpath(input.repositoryRoot);
  const requestedPath = assertSafeText(input.requestedPath, 'worktree path');
  if (isAbsolute(requestedPath) || !worktreeRelativePath.test(requestedPath)) {
    throw new CapabilityBoundaryError('worktree must be one .worktrees/issue-* segment');
  }
  const lexicalPath = resolve(repositoryRoot, requestedPath);
  await rejectSymlinkSegments(repositoryRoot, lexicalPath);
  const worktreePath = await realpath(lexicalPath);
  const registered = await Promise.all(input.registeredWorktrees.map((path) => realpath(path)));
  if (!registered.includes(worktreePath)) {
    throw new CapabilityBoundaryError('worktree is not registered');
  }
  if (relative(resolve(repositoryRoot, '.worktrees'), worktreePath).split(sep).length !== 1) {
    throw new CapabilityBoundaryError('worktree nesting is forbidden');
  }
  return Object.freeze({ repositoryRoot, worktreePath });
}

export function validateWorktreeRuntime(expected) {
  const actualRoot = discoverRepositoryRoot(process.cwd());
  const actualRealpath = realpathSync(actualRoot);
  if (actualRealpath !== expected.worktreePath) throw new CapabilityBoundaryError('cwd is not the assigned worktree root');
  const branch = runGitFile(['branch', '--show-current'], { cwd: actualRoot });
  const head = runGitFile(['rev-parse', 'HEAD'], { cwd: actualRoot });
  if (branch !== expected.branch) throw new CapabilityBoundaryError('branch does not match the assignment');
  if (head !== expected.expectedHead) throw new CapabilityBoundaryError('assignment already produced its commit');
  return Object.freeze({ branch, head, worktreePath: actualRealpath });
}
