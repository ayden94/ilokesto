import { createHash } from 'node:crypto';
import { accessSync, constants, realpathSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CapabilityBoundaryError,
  assertSafeText,
  createVerifierReadGrant,
  runSandboxedFile,
  validateWorktreeRuntime,
} from './worktree-boundary.mjs';

const scopedRole = 'ilokesto-scoped-implementer';
const uiRole = 'ilokesto-ui-implementer';
const packageNames = ['store', 'state', 'form', 'fetcher', 'overlay', 'modal', 'toast', 'utilinent'];

const trustedConfigs = {
  form: { tsup: 'tsup.config.ts', vitest: 'vite.config.ts' },
  fetcher: { tsup: 'tsup.config.ts', vitest: 'vitest.config.ts' },
  modal: { tsup: 'tsup.config.ts', vitest: 'vitest.config.ts' },
  overlay: { vitest: 'vitest.config.ts' },
  store: { vitest: 'vitest.config.ts' },
  toast: { vitest: 'vitest.config.ts' },
  utilinent: { vitest: 'vitest.config.ts' },
};

const spawn = (packageName, command, ...args) => {
  const step = {
    command: 'pnpm',
    args: ['--filter', `@ilokesto/${packageName}`, 'exec', command, ...args],
    operation: 'spawn',
    packageName,
  };
  const config = trustedConfigs[packageName]?.[command];
  return config ? { ...step, config } : step;
};
const removeDist = (packageName) => ({ operation: 'remove', packageName, path: `packages/${packageName}/dist` });
const trustedScript = (packageName, path, dependencies = []) => ({
  dependencies,
  operation: 'trusted-script',
  packageName,
  path,
});

const build = {
  store: [removeDist('store'), spawn('store', 'tsc')],
  state: [removeDist('state'), spawn('state', 'tsc')],
  form: [spawn('form', 'tsup')],
  fetcher: [spawn('fetcher', 'tsup')],
  overlay: [removeDist('overlay'), spawn('overlay', 'tsc')],
  modal: [spawn('modal', 'tsup')],
  toast: [removeDist('toast'), spawn('toast', 'tsc')],
  utilinent: [removeDist('utilinent'), spawn('utilinent', 'tsc')],
};

const plans = {
  [scopedRole]: {
    store: {
      build: build.store,
      typecheck: [spawn('store', 'tsc', '--noEmit'), spawn('store', 'tsc', '--project', 'tsconfig.typecheck.json')],
      test: [spawn('store', 'vitest', 'run')],
    },
    state: {
      build: build.state,
      typecheck: [spawn('state', 'tsc', '--noEmit')],
      test: [{ command: 'bun', args: ['test'], cwd: 'packages/state', operation: 'spawn', packageName: 'state' }],
      'test:typecheck': [...build.state, spawn('state', 'tsc', '--noEmit', '-p', 'test/tsconfig.json')],
    },
    form: {
      build: build.form,
      typecheck: [spawn('form', 'tsc', '--noEmit')],
      test: [spawn('form', 'vitest', 'run')],
      'test:pack': [...build.form, trustedScript('form', 'scripts/verify-package.mjs')],
    },
    fetcher: {
      build: build.fetcher,
      typecheck: [spawn('fetcher', 'tsc', '-p', 'tsconfig.json', '--noEmit')],
      test: [spawn('fetcher', 'vitest', 'run')],
      'test:dist': [trustedScript('fetcher', 'scripts/verify-dist.mjs', ['scripts/verify-packed-dist.mjs'])],
    },
  },
  [uiRole]: {
    form: {},
    overlay: {
      build: build.overlay,
      typecheck: [spawn('overlay', 'tsc', '--noEmit', '-p', 'tsconfig.test.json')],
      test: [spawn('overlay', 'vitest', 'run')],
    },
    modal: {
      build: build.modal,
      typecheck: [spawn('modal', 'tsc', '--noEmit')],
      test: [spawn('modal', 'vitest', 'run')],
      'test:e2e': [spawn('modal', 'playwright', 'test', 'modal.e2e.ts')],
      'test:a11y': [spawn('modal', 'playwright', 'test', 'modal.a11y.ts')],
      'test:pack': [
        ...build.modal,
        spawn('modal', 'publint'),
        spawn('modal', 'attw', '--pack', '.', '--profile', 'esm-only'),
        trustedScript('modal', 'scripts/validate-package.mjs'),
      ],
    },
    toast: {
      build: build.toast,
      typecheck: [spawn('toast', 'tsc', '--noEmit')],
      test: [spawn('toast', 'vitest', 'run')],
    },
    utilinent: {
      build: build.utilinent,
      typecheck: [
        spawn('utilinent', 'tsc', '--noEmit', '-p', 'test/tsconfig.json'),
        ...build.utilinent,
        spawn('utilinent', 'tsc', '--noEmit', '-p', 'test/react19/tsconfig.json'),
      ],
      test: [spawn('utilinent', 'vitest', 'run')],
      'typecheck:react19': [...build.utilinent, spawn('utilinent', 'tsc', '--noEmit', '-p', 'test/react19/tsconfig.json')],
    },
  },
};
plans[uiRole].form = plans[scopedRole].form;
plans[uiRole].modal['test:ci'] = [
  ...plans[uiRole].modal.test,
  ...plans[uiRole].modal['test:e2e'],
  ...plans[uiRole].modal['test:a11y'],
  ...plans[uiRole].modal['test:pack'],
];

export function getVerificationPlan(role, packageName, verifier) {
  assertSafeText(role, 'role');
  assertSafeText(packageName, 'package');
  assertSafeText(verifier, 'verifier');
  const plan = plans[role]?.[packageName]?.[verifier];
  if (!plan) throw new CapabilityBoundaryError('verifier is not allowed for this role and package');
  return structuredClone(plan);
}

export async function validateTrustedScript(trustedPath, assignedPath) {
  const [trusted, assigned] = await Promise.all([readFile(trustedPath), readFile(assignedPath)]);
  const digest = (content) => createHash('sha256').update(content).digest('hex');
  if (digest(trusted) !== digest(assigned)) throw new CapabilityBoundaryError('assigned verifier script was modified');
}

async function validateWorkspaceScripts(trustedRoot, worktreeRoot) {
  for (const packageName of packageNames) {
    const paths = [trustedRoot, worktreeRoot].map((root) => join(root, 'packages', packageName, 'package.json'));
    const manifests = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
    if (JSON.stringify(manifests[0].scripts) !== JSON.stringify(manifests[1].scripts)) {
      throw new CapabilityBoundaryError(`package scripts were modified: ${packageName}`);
    }
  }
}

async function canonicalTrustedPath(trustedRoot, path) {
  const lexical = resolve(trustedRoot, path);
  const canonical = await realpath(lexical);
  const fromRoot = relative(trustedRoot, canonical);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new CapabilityBoundaryError('trusted verifier read path is outside the trusted root');
  }
  return canonical;
}

async function createVerifierTools(trustedRoot, plan) {
  const tools = {};
  for (const step of plan) {
    if (step.operation !== 'spawn' || step.command !== 'pnpm') continue;
    const command = step.args[3];
    tools[`${step.packageName}:${command}`] = await canonicalTrustedPath(
      trustedRoot,
      `packages/${step.packageName}/node_modules/.bin/${command}`,
    );
  }
  return Object.freeze(tools);
}

async function linkTrustedDependencies(trustedRoot, worktreeRoot, sandboxRoot, plan) {
  const links = [];
  try {
    for (const packageName of new Set(plan.map((step) => step.packageName))) {
      const assigned = join(worktreeRoot, 'packages', packageName, 'node_modules');
      try {
        await lstat(assigned);
        throw new CapabilityBoundaryError(`assigned dependency directory already exists: ${packageName}`);
      } catch (error) {
        if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
      }
      const trusted = await canonicalTrustedPath(trustedRoot, `packages/${packageName}/node_modules`);
      const facade = join(sandboxRoot, 'dependencies', packageName);
      await mkdir(facade, { recursive: true });
      for (const entry of await readdir(trusted, { withFileTypes: true })) {
        const target = join(facade, entry.name);
        if (entry.name === '.vite' || entry.name === '.vite-temp') {
          await mkdir(target);
        } else {
          const source = await realpath(join(trusted, entry.name));
          await symlink(source, target, entry.isDirectory() ? 'dir' : 'file');
        }
      }
      await symlink(facade, assigned, 'dir');
      links.push(assigned);
    }
  } catch (error) {
    await Promise.all(links.map((path) => rm(path, { force: true })));
    throw error;
  }
  return Object.freeze(links);
}

async function copyTrustedConfigs(trustedRoot, worktreeRoot, plan) {
  const configs = {};
  const created = [];
  try {
    for (const step of plan) {
      if (!step.config) continue;
      const key = `${step.packageName}:${step.config}`;
      if (configs[key]) continue;
      const trusted = await canonicalTrustedPath(trustedRoot, `packages/${step.packageName}/${step.config}`);
      const assigned = join(
        worktreeRoot,
        'packages',
        step.packageName,
        `.ilokesto-verifier-${basename(step.config)}`,
      );
      await writeFile(assigned, await readFile(trusted), { flag: 'wx', mode: 0o400 });
      configs[key] = assigned;
      created.push(assigned);
    }
  } catch (error) {
    await Promise.all(created.map((path) => rm(path, { force: true })));
    throw error;
  }
  return Object.freeze({ configs: Object.freeze(configs), created: Object.freeze(created) });
}

export function createVerifierEnvironment(sandboxHome, sandboxTemporary, nodeExecutable, pnpmExecutable = nodeExecutable) {
  const executablePath = [...new Set([dirname(nodeExecutable), dirname(pnpmExecutable)])].join(':');
  return Object.freeze({
    CI: '1',
    FORCE_COLOR: '0',
    HOME: sandboxHome,
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    NO_COLOR: '1',
    PATH: `${executablePath}:/usr/bin:/bin:/usr/sbin:/sbin`,
    PLAYWRIGHT_BROWSERS_PATH: join(userInfo().homedir, 'Library', 'Caches', 'ms-playwright'),
    PNPM_HOME: dirname(pnpmExecutable),
    SHELL: '/bin/sh',
    TERM: 'dumb',
    TMPDIR: sandboxTemporary,
    XDG_CACHE_HOME: join(sandboxHome, '.cache'),
    npm_config_cache: join(sandboxHome, '.cache', 'npm'),
  });
}

function trustedExecutable(environmentKey, label) {
  const candidate = assertSafeText(process.env[environmentKey], `${label} executable`);
  if (!isAbsolute(candidate)) throw new CapabilityBoundaryError(`${label} executable is invalid`);
  try {
    accessSync(candidate, constants.X_OK);
    const canonical = realpathSync(candidate);
    if (canonical !== candidate) throw new CapabilityBoundaryError(`${label} executable is not canonical`);
    return canonical;
  } catch (error) {
    if (error instanceof CapabilityBoundaryError) throw error;
    throw new CapabilityBoundaryError(`${label} executable is unavailable`);
  }
}

async function executeStep(step, roots) {
  if (step.operation === 'remove') {
    await rm(resolve(roots.worktree, step.path), { force: true, recursive: true });
    return;
  }
  if (step.operation === 'trusted-script') {
    const modulePaths = [step.path, ...step.dependencies];
    const modules = {};
    for (const path of modulePaths) {
      const trusted = join(roots.trusted, 'packages', step.packageName, path);
      const assigned = join(roots.worktree, 'packages', step.packageName, path);
      await validateTrustedScript(trusted, assigned);
      modules[pathToFileURL(assigned).href] = (await readFile(trusted)).toString('base64');
    }
    const assigned = join(roots.worktree, 'packages', step.packageName, step.path);
    const bootstrap = `
      import { registerHooks } from 'node:module';
      const modules = ${JSON.stringify(modules)};
      registerHooks({
        load(url, context, nextLoad) {
          const encoded = modules[url];
          return encoded === undefined
            ? nextLoad(url, context)
            : { format: 'module', shortCircuit: true, source: Buffer.from(encoded, 'base64').toString('utf8') };
        },
      });
      await import(${JSON.stringify(pathToFileURL(assigned).href)});
    `;
    runSandboxedFile(roots.executables.node, ['--input-type=module', '--eval', bootstrap], {
      cwd: join(roots.worktree, 'packages', step.packageName),
      env: roots.environment,
      readGrant: roots.readGrant,
      stdio: 'inherit',
      worktreePath: roots.worktree,
    });
    return;
  }
  const args = [...step.args];
  if (step.command === 'pnpm') args[3] = roots.tools[`${step.packageName}:${step.args[3]}`];
  if (step.config) args.push('--config', roots.configs[`${step.packageName}:${step.config}`]);
  runSandboxedFile(roots.executables[step.command], args, {
    cwd: step.cwd ? resolve(roots.worktree, step.cwd) : roots.worktree,
    env: roots.environment,
    readGrant: roots.readGrant,
    stdio: 'inherit',
    worktreePath: roots.worktree,
  });
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2) throw new CapabilityBoundaryError('verify requires package and verifier');
  const role = assertSafeText(process.env.ILOKESTO_IMPLEMENTER_ROLE, 'implementer role');
  const assignment = {
    branch: assertSafeText(process.env.ILOKESTO_ASSIGNED_BRANCH, 'assigned branch'),
    expectedHead: assertSafeText(process.env.ILOKESTO_ASSIGNED_HEAD, 'assigned head'),
    worktreePath: await realpath(assertSafeText(process.env.ILOKESTO_ASSIGNED_WORKTREE, 'assigned worktree')),
  };
  validateWorktreeRuntime(assignment);
  const trustedRoot = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'));
  const executables = Object.freeze({
    bun: trustedExecutable('ILOKESTO_BUN_EXECUTABLE', 'bun'),
    node: trustedExecutable('ILOKESTO_NODE_EXECUTABLE', 'node'),
    opencode: trustedExecutable('ILOKESTO_OPENCODE_EXECUTABLE', 'opencode'),
    pnpm: trustedExecutable('ILOKESTO_PNPM_EXECUTABLE', 'pnpm'),
  });
  await validateWorkspaceScripts(trustedRoot, assignment.worktreePath);
  const sandboxRoot = join(assignment.worktreePath, '.ilokesto-verifier');
  const sandboxHome = join(sandboxRoot, 'home');
  const sandboxTemporary = join(sandboxRoot, 'tmp');
  await Promise.all([
    mkdir(join(sandboxHome, '.cache'), { recursive: true }),
    mkdir(sandboxTemporary, { recursive: true }),
  ]);
  const plan = getVerificationPlan(role, argv[0], argv[1]);
  const tools = await createVerifierTools(trustedRoot, plan);
  const roots = {
    environment: createVerifierEnvironment(sandboxHome, sandboxTemporary, executables.node, executables.pnpm),
    executables,
    readGrant: await createVerifierReadGrant(trustedRoot, executables, plan),
    tools,
    trusted: trustedRoot,
    worktree: assignment.worktreePath,
  };
  const dependencyLinks = await linkTrustedDependencies(trustedRoot, assignment.worktreePath, sandboxRoot, plan);
  let trustedConfigs;
  try {
    trustedConfigs = await copyTrustedConfigs(trustedRoot, assignment.worktreePath, plan);
    roots.configs = trustedConfigs.configs;
    for (const step of plan) await executeStep(step, roots);
  } finally {
    await Promise.all([
      ...dependencyLinks.map((path) => rm(path, { force: true })),
      ...(trustedConfigs?.created ?? []).map((path) => rm(path, { force: true })),
      rm(sandboxRoot, { force: true, recursive: true }),
    ]);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
