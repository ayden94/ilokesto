import { spawnSync } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import { access, lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { userInfo } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CapabilityBoundaryError,
  assertSafeText,
  discoverRegisteredWorktrees,
  discoverRepositoryRoot,
  discoverGitDirectory,
  runGitFile,
  validateAssignedWorktree,
} from './worktree-boundary.mjs';

const roles = ['ilokesto-scoped-implementer', 'ilokesto-ui-implementer'];
const handoffKeys = [
  'BASE_BRANCH', 'BLOCKERS', 'BRANCH_NAME', 'EXISTING_PR', 'FIX_BACK_ATTEMPT', 'ISSUE_NUMBER',
  'ISSUE_TITLE', 'ISSUE_URL', 'MODE', 'PACKAGE', 'WORKTREE_PATH',
];
const handoffPathPattern = /^\.omo\/inbox\/[A-Za-z0-9][A-Za-z0-9._-]*\.json$/u;
const branchPattern = /^issue-[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const sessionPattern = /^ses_[A-Za-z0-9]+$/u;
const approvedIndexManifest = 'ilokesto-implementer-approved-index.json';
const approvedPrivateIndex = 'ilokesto-implementer.index';

const trustedExecutableCandidates = Object.freeze({
  bun: [join(userInfo().homedir, '.bun', 'bin', 'bun'), '/opt/homebrew/bin/bun', '/usr/local/bin/bun'],
  opencode: [join(userInfo().homedir, '.opencode', 'bin', 'opencode'), join(userInfo().homedir, '.local', 'bin', 'opencode'), '/opt/homebrew/bin/opencode', '/usr/local/bin/opencode'],
  pnpm: [join(userInfo().homedir, 'Library', 'pnpm', 'pnpm'), join(userInfo().homedir, '.local', 'share', 'pnpm', 'pnpm'), join(userInfo().homedir, '.local', 'bin', 'pnpm'), '/opt/homebrew/bin/pnpm', '/usr/local/bin/pnpm'],
});

function resolveTrustedExecutable(name) {
  for (const candidate of trustedExecutableCandidates[name] ?? []) {
    try {
      accessSync(candidate, constants.X_OK);
      return realpathSync(candidate);
    } catch {
      // Keep searching fixed supervisor tool locations.
    }
  }
  throw new CapabilityBoundaryError(`${name} executable is unavailable`);
}

function assertSafeValue(value) {
  if (typeof value === 'string') assertSafeText(value, 'handoff text');
  if (Array.isArray(value)) value.forEach(assertSafeValue);
  if (value && typeof value === 'object' && !Array.isArray(value)) Object.values(value).forEach(assertSafeValue);
}

async function readHandoff(repositoryRoot, handoffRelativePath) {
  assertSafeText(handoffRelativePath, 'handoff path');
  if (!handoffPathPattern.test(handoffRelativePath)) throw new CapabilityBoundaryError('handoff path is invalid');
  const handoffPath = resolve(repositoryRoot, handoffRelativePath);
  const inbox = await realpath(resolve(repositoryRoot, '.omo', 'inbox'));
  if (dirname(handoffPath) !== inbox || relative(inbox, handoffPath).includes(sep)) {
    throw new CapabilityBoundaryError('handoff must be a direct inbox file');
  }
  if ((await lstat(handoffPath)).isSymbolicLink()) throw new CapabilityBoundaryError('handoff symlinks are forbidden');
  const source = await readFile(handoffPath, 'utf8');
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new CapabilityBoundaryError('handoff must be an object');
  if (JSON.stringify(parsed) !== source) throw new CapabilityBoundaryError('handoff must be canonical compact JSON');
  if (JSON.stringify(Object.keys(parsed).sort()) !== JSON.stringify([...handoffKeys].sort())) {
    throw new CapabilityBoundaryError('handoff keys are invalid');
  }
  assertSafeValue(parsed);
  return { parsed, source };
}

export function createChildConfig(role, workflowScriptsRoot) {
  if (!roles.includes(role)) throw new CapabilityBoundaryError('role is invalid');
  const vcs = join(workflowScriptsRoot, 'implementer-vcs.mjs');
  const verify = join(workflowScriptsRoot, 'implementer-verify.mjs');
  return {
    agent: {
      [role]: {
        permission: {
          edit: 'allow',
          external_directory: 'deny',
          bash: {
            '*': 'deny',
            [`node ${vcs} stage *`]: 'allow',
            [`node ${vcs} commit *`]: 'allow',
            [`node ${verify} *`]: 'allow',
            '*\n*': 'deny', '*\r*': 'deny', '*\t*': 'deny', '*;*': 'deny', '*&&*': 'deny',
            '*|*': 'deny', '*>*': 'deny', '*<*': 'deny', '*`*': 'deny', '*$(*': 'deny',
          },
        },
      },
    },
  };
}

export async function validateLaunchInput(input) {
  if (input.argv.length !== 3 && input.argv.length !== 4) throw new CapabilityBoundaryError('launcher arguments are invalid');
  const [role, requestedPath, handoffRelativePath, session] = input.argv;
  if (!roles.includes(role)) throw new CapabilityBoundaryError('role is invalid');
  if (session !== undefined && !sessionPattern.test(session)) throw new CapabilityBoundaryError('session is invalid');
  const boundary = await validateAssignedWorktree({
    repositoryRoot: input.repositoryRoot,
    requestedPath,
    registeredWorktrees: input.registeredWorktrees,
  });
  const handoff = await readHandoff(boundary.repositoryRoot, handoffRelativePath);
  if (handoff.parsed.WORKTREE_PATH !== boundary.worktreePath) throw new CapabilityBoundaryError('handoff worktree does not match');
  if (handoff.parsed.BRANCH_NAME !== requestedPath.slice('.worktrees/'.length) || !branchPattern.test(handoff.parsed.BRANCH_NAME)) {
    throw new CapabilityBoundaryError('handoff branch does not match');
  }
  return Object.freeze({ ...boundary, handoff: handoff.source, role, session });
}

export function buildLaunch(input, workflowScriptsRoot) {
  const argv = ['run', '--dir', input.worktreePath, '--agent', input.role, '--format', 'json'];
  if (input.session) argv.push('--session', input.session);
  argv.push('--', input.handoff);
  const branch = input.worktreePath.slice(input.worktreePath.lastIndexOf(sep) + 1);
  const expectedHead = assertSafeText(input.expectedHead, 'expected head');
  const executables = input.executables ?? {
    bun: resolveTrustedExecutable('bun'),
    node: realpathSync(process.execPath),
    opencode: resolveTrustedExecutable('opencode'),
    pnpm: resolveTrustedExecutable('pnpm'),
  };
  return {
    argv,
    command: executables.opencode,
    options: {
      cwd: input.repositoryRoot,
      env: {
        HOME: userInfo().homedir,
        ILOKESTO_ASSIGNED_BRANCH: branch,
        ILOKESTO_ASSIGNED_HEAD: expectedHead,
        ILOKESTO_ASSIGNED_WORKTREE: input.worktreePath,
        ILOKESTO_BUN_EXECUTABLE: executables.bun,
        ILOKESTO_IMPLEMENTER_ROLE: input.role,
        ILOKESTO_NODE_EXECUTABLE: executables.node,
        ILOKESTO_OPENCODE_EXECUTABLE: executables.opencode,
        ILOKESTO_PNPM_EXECUTABLE: executables.pnpm,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
        OPENCODE_CONFIG_CONTENT: JSON.stringify(createChildConfig(input.role, workflowScriptsRoot)),
        PATH: `${dirname(executables.node)}:/usr/bin:/bin:/usr/sbin:/sbin`,
        SHELL: '/bin/sh',
        TERM: 'dumb',
      },
      shell: false,
      stdio: 'inherit',
    },
  };
}

export async function main(argv = process.argv.slice(2)) {
  const trustedRepositoryRoot = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'));
  const repositoryRoot = await realpath(discoverRepositoryRoot(process.cwd()));
  if (repositoryRoot !== trustedRepositoryRoot) throw new CapabilityBoundaryError('launcher must run from its trusted repository');
  const input = await validateLaunchInput({
    argv,
    repositoryRoot,
    registeredWorktrees: discoverRegisteredWorktrees(repositoryRoot),
  });
  const actualBranch = runGitFile(['branch', '--show-current'], { cwd: input.worktreePath });
  if (actualBranch !== JSON.parse(input.handoff).BRANCH_NAME) {
    throw new CapabilityBoundaryError('registered worktree branch does not match the handoff');
  }
  if (runGitFile(['diff', '--cached', '--name-only'], { cwd: input.worktreePath }) !== '') {
    throw new CapabilityBoundaryError('implementer launch requires a clean index');
  }
  const gitDirectory = await discoverGitDirectory(input.worktreePath);
  for (const name of [approvedIndexManifest, approvedPrivateIndex]) {
    try {
      await access(join(gitDirectory, name));
      throw new CapabilityBoundaryError('implementer launch found stale approved-index state');
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
    }
  }
  const launch = buildLaunch({
    ...input,
    expectedHead: runGitFile(['rev-parse', 'HEAD'], { cwd: input.worktreePath }),
  }, dirname(fileURLToPath(import.meta.url)));
  const result = spawnSync(launch.command, launch.argv, launch.options);
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
