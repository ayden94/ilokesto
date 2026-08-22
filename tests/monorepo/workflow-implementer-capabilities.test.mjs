import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, chmod, link, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import {
  buildLaunch,
  createChildConfig,
  validateLaunchInput,
} from '../../scripts/workflow/implementer-launcher.mjs';
import {
  assertApprovedIndex,
  updateBranchAtomically,
  validateCommitMessage,
  validateStagePaths,
} from '../../scripts/workflow/implementer-vcs.mjs';
import {
  createVerifierEnvironment,
  getVerificationPlan,
  validateTrustedScript,
} from '../../scripts/workflow/implementer-verify.mjs';
import {
  createSandboxPolicy,
  createVerifierReadGrant,
  runSandboxedFile,
  validateAssignedWorktree,
} from '../../scripts/workflow/worktree-boundary.mjs';

const scopedRole = 'ilokesto-scoped-implementer';
const uiRole = 'ilokesto-ui-implementer';
const verifierMatrix = {
  [scopedRole]: {
    store: ['build', 'typecheck', 'test'],
    state: ['build', 'typecheck', 'test', 'test:typecheck'],
    form: ['build', 'typecheck', 'test', 'test:pack'],
    fetcher: ['build', 'typecheck', 'test', 'test:dist'],
  },
  [uiRole]: {
    form: ['build', 'typecheck', 'test', 'test:pack'],
    overlay: ['build', 'typecheck', 'test'],
    modal: ['build', 'typecheck', 'test', 'test:e2e', 'test:a11y', 'test:pack', 'test:ci'],
    toast: ['build', 'typecheck', 'test'],
    utilinent: ['build', 'typecheck', 'test', 'typecheck:react19'],
  },
};
const vcsWrapper = new URL('../../scripts/workflow/implementer-vcs.mjs', import.meta.url).pathname;

function git(repository, args, options = {}) {
  const result = spawnSync('/usr/bin/git', args, {
    cwd: repository,
    encoding: 'utf8',
    input: options.input,
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

async function createDisposableRepository(testContext) {
  const repository = await mkdtemp(join(tmpdir(), 'ilokesto-vcs-real-'));
  testContext.after(() => rm(repository, { force: true, recursive: true }));
  git(repository, ['init', '-b', 'issue-123-test']);
  git(repository, ['config', 'user.name', 'Todo Eight Test']);
  git(repository, ['config', 'user.email', 'todo8@example.test']);
  await Promise.all([
    writeFile(join(repository, 'approved.txt'), 'approved baseline\n'),
    writeFile(join(repository, 'extra.txt'), 'extra baseline\n'),
  ]);
  git(repository, ['add', '--', 'approved.txt', 'extra.txt']);
  git(repository, ['commit', '-m', 'initial']);
  const expectedHead = git(repository, ['rev-parse', 'HEAD']);
  const environment = {
    ILOKESTO_ASSIGNED_BRANCH: 'issue-123-test',
    ILOKESTO_ASSIGNED_HEAD: expectedHead,
    ILOKESTO_ASSIGNED_WORKTREE: repository,
  };
  const invoke = (args) => spawnSync(process.execPath, [vcsWrapper, ...args], {
    cwd: repository,
    encoding: 'utf8',
    env: environment,
    shell: false,
  });
  return { environment, expectedHead, invoke, repository };
}

function handoff(worktreePath) {
  return JSON.stringify({
    BASE_BRANCH: 'main',
    BLOCKERS: [],
    BRANCH_NAME: 'issue-123-test',
    EXISTING_PR: null,
    FIX_BACK_ATTEMPT: null,
    ISSUE_NUMBER: 123,
    ISSUE_TITLE: 'Test issue',
    ISSUE_URL: 'https://github.com/ilokesto/ilokesto/issues/123',
    MODE: 'new-pr',
    PACKAGE: 'store',
    WORKTREE_PATH: worktreePath,
  });
}

test('launcher accepts one canonical assigned-worktree handoff and constructs fixed argv', async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'ilokesto-launch-'));
  const worktreePath = join(repositoryRoot, '.worktrees', 'issue-123-test');
  const inboxPath = join(repositoryRoot, '.omo', 'inbox');
  await mkdir(worktreePath, { recursive: true });
  await mkdir(inboxPath, { recursive: true });
  const handoffPath = join(inboxPath, 'worker-123.json');
  const canonicalWorktreePath = await realpath(worktreePath);
  await writeFile(handoffPath, handoff(canonicalWorktreePath));

  const boundary = await validateAssignedWorktree({
    repositoryRoot,
    requestedPath: '.worktrees/issue-123-test',
    registeredWorktrees: [worktreePath],
  });
  const input = await validateLaunchInput({
    argv: [scopedRole, '.worktrees/issue-123-test', '.omo/inbox/worker-123.json'],
    repositoryRoot,
    registeredWorktrees: [worktreePath],
  });
  const previousNodeOptions = process.env.NODE_OPTIONS;
  const previousOpenCodeApiKey = process.env.OPENCODE_API_KEY;
  process.env.NODE_OPTIONS = '--import=/attacker/runtime-hook.mjs';
  process.env.OPENCODE_API_KEY = 'sentinel-supervisor-secret';
  let launch;
  try {
    launch = buildLaunch({
      ...input,
      executables: { bun: '/trusted/bun', node: '/trusted/node', opencode: '/trusted/opencode', pnpm: '/trusted/pnpm' },
      expectedHead: 'a'.repeat(40),
    }, '/trusted/root/scripts/workflow');
  } finally {
    if (previousNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previousNodeOptions;
    if (previousOpenCodeApiKey === undefined) delete process.env.OPENCODE_API_KEY;
    else process.env.OPENCODE_API_KEY = previousOpenCodeApiKey;
  }

  assert.equal(boundary.worktreePath, canonicalWorktreePath);
  assert.deepEqual(launch.argv, [
    'run', '--dir', canonicalWorktreePath, '--agent', scopedRole, '--format', 'json', '--', handoff(canonicalWorktreePath),
  ]);
  assert.equal(launch.options.shell, false);
  assert.equal(launch.options.cwd, await realpath(repositoryRoot));
  assert.equal(launch.options.env.ILOKESTO_ASSIGNED_WORKTREE, canonicalWorktreePath);
  assert.equal(launch.options.env.ILOKESTO_BUN_EXECUTABLE, '/trusted/bun');
  assert.equal(launch.options.env.ILOKESTO_NODE_EXECUTABLE, '/trusted/node');
  assert.equal(launch.options.env.ILOKESTO_OPENCODE_EXECUTABLE, '/trusted/opencode');
  assert.equal(launch.options.env.ILOKESTO_PNPM_EXECUTABLE, '/trusted/pnpm');
  assert.equal(launch.command, '/trusted/opencode');
  assert.equal(launch.options.env.NODE_OPTIONS, undefined);
  assert.equal(launch.options.env.OPENCODE_API_KEY, undefined);
  assert.equal(launch.options.env.PATH, '/trusted:/usr/bin:/bin:/usr/sbin:/sbin');
  assert.deepEqual(Object.keys(launch.options.env).sort(), [
    'HOME', 'ILOKESTO_ASSIGNED_BRANCH', 'ILOKESTO_ASSIGNED_HEAD', 'ILOKESTO_ASSIGNED_WORKTREE',
    'ILOKESTO_BUN_EXECUTABLE', 'ILOKESTO_IMPLEMENTER_ROLE', 'ILOKESTO_NODE_EXECUTABLE',
    'ILOKESTO_OPENCODE_EXECUTABLE', 'ILOKESTO_PNPM_EXECUTABLE', 'LANG', 'LC_ALL',
    'OPENCODE_CONFIG_CONTENT', 'PATH', 'SHELL', 'TERM',
  ]);
});

test('launcher rejects alternate authority, controls, duplicate flags, traversal, and sessions', async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'ilokesto-launch-attacks-'));
  const worktreePath = join(repositoryRoot, '.worktrees', 'issue-123-test');
  const inboxPath = join(repositoryRoot, '.omo', 'inbox');
  await mkdir(worktreePath, { recursive: true });
  await mkdir(inboxPath, { recursive: true });
  await writeFile(join(inboxPath, 'valid.json'), handoff(worktreePath));

  const attacks = [
    ['build', '.worktrees/issue-123-test', '.omo/inbox/valid.json'],
    [scopedRole, '.', '.omo/inbox/valid.json'],
    [scopedRole, '.worktrees/issue-123-test/../issue-2', '.omo/inbox/valid.json'],
    [scopedRole, '.worktrees/issue-123-test', '../valid.json'],
    [scopedRole, '.worktrees/issue-123-test', '.omo/inbox/valid.json', '--agent', 'build'],
    [scopedRole, '.worktrees/issue-123-test', '.omo/inbox/valid.json', 'ses_valid', '--dir', '.'],
    [scopedRole, '.worktrees/issue-123-test\n--agent build', '.omo/inbox/valid.json'],
    [scopedRole, '.worktrees/issue-123-test\r', '.omo/inbox/valid.json'],
    [scopedRole, '.worktrees/issue-123-test\t', '.omo/inbox/valid.json'],
    [scopedRole, '.worktrees/issue-123-test', '.omo/inbox/valid.json', 'session_bad'],
  ];
  for (const argv of attacks) {
    await assert.rejects(validateLaunchInput({ argv, repositoryRoot, registeredWorktrees: [worktreePath] }));
  }

  const poisoned = JSON.parse(handoff(worktreePath));
  poisoned.ISSUE_TITLE = 'safe\n--agent build';
  await writeFile(join(inboxPath, 'poisoned.json'), JSON.stringify(poisoned));
  await assert.rejects(validateLaunchInput({
    argv: [scopedRole, '.worktrees/issue-123-test', '.omo/inbox/poisoned.json'],
    repositoryRoot,
    registeredWorktrees: [worktreePath],
  }));
});

test('worktree validation rejects root, sibling, traversal, unregistered, and symlink targets', async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'ilokesto-boundary-'));
  const assigned = join(repositoryRoot, '.worktrees', 'issue-123-test');
  const sibling = join(repositoryRoot, '.worktrees', 'issue-124-sibling');
  await mkdir(assigned, { recursive: true });
  await mkdir(sibling, { recursive: true });
  await symlink(sibling, join(repositoryRoot, '.worktrees', 'issue-125-link'));
  const registeredWorktrees = [assigned, sibling];

  for (const requestedPath of [
    '.',
    '.worktrees/issue-124-sibling',
    '.worktrees/issue-123-test/../issue-124-sibling',
    '.worktrees/issue-123-test/.worktrees/issue-123-test',
    '.worktrees/issue-999-unregistered',
    '.worktrees/issue-125-link',
    sibling,
  ]) {
    await assert.rejects(validateAssignedWorktree({
      repositoryRoot,
      requestedPath,
      registeredWorktrees: [assigned],
    }));
  }
});

test('child config grants only root-owned wrappers and keeps shell composition denied last', () => {
  const config = createChildConfig(scopedRole, '/trusted/root/scripts/workflow');
  const permissions = config.agent[scopedRole].permission;
  const bashEntries = Object.entries(permissions.bash);

  assert.equal(permissions.edit, 'allow');
  assert.equal(permissions.external_directory, 'deny');
  assert.deepEqual(bashEntries.slice(0, 4), [
    ['*', 'deny'],
    ['node /trusted/root/scripts/workflow/implementer-vcs.mjs stage *', 'allow'],
    ['node /trusted/root/scripts/workflow/implementer-vcs.mjs commit *', 'allow'],
    ['node /trusted/root/scripts/workflow/implementer-verify.mjs *', 'allow'],
  ]);
  for (const pattern of ['*\n*', '*\r*', '*\t*', '*;*', '*&&*', '*|*', '*>*', '*<*', '*`*', '*$(*']) {
    assert.equal(permissions.bash[pattern], 'deny', pattern);
  }
});

test('VCS validator permits explicit local files and rejects pathspec, bulk, option, and trailer attacks', () => {
  assert.deepEqual(validateStagePaths(['packages/store/src/index.ts', '.changeset/task.md']), [
    'packages/store/src/index.ts', '.changeset/task.md',
  ]);
  for (const path of [
    '.', '..', '../README.md', '/tmp/file', '~/file', '$HOME/file', '${HOME}/file',
    ':/README.md', ':(top)README.md', ':!README.md', '--all', '-A', 'packages/store/**',
    'packages/store/src\n../README.md', 'packages/store/src\rfile', 'packages/store/src\tfile',
  ]) assert.throws(() => validateStagePaths([path]), undefined, path);
  assert.throws(() => validateStagePaths([]));
  assert.throws(() => validateStagePaths(Array.from({ length: 101 }, (_, index) => `file-${index}`)));

  assert.equal(validateCommitMessage('fix: preserve selector identity'), 'fix: preserve selector identity');
  for (const message of [
    '--amend', '--no-verify', 'fix: test\nCo-Authored-By: attacker <a@example.com>',
    'fix: test\rnext', 'fix: test\tnext',
  ]) assert.throws(() => validateCommitMessage(message), undefined, message);
});

test('commit index approval rejects pre-populated, extra, and raced cached state', () => {
  const approved = { paths: ['packages/store/src/index.ts'], status: 'M\0packages/store/src/index.ts\0', tree: 'a'.repeat(40) };
  assert.doesNotThrow(() => assertApprovedIndex({ ...approved }, approved));
  for (const actual of [
    { ...approved, paths: ['README.md', ...approved.paths] },
    { ...approved, status: 'A\0packages/store/src/index.ts\0' },
    { ...approved, tree: 'b'.repeat(40) },
  ]) assert.throws(() => assertApprovedIndex(actual, approved));
});

test('real VCS wrapper commits only private-index approved content and exactly one new commit', async (context) => {
  const fixture = await createDisposableRepository(context);
  const hooksDirectory = join(fixture.repository, '.git', 'hooks');
  const hooks = {
    'commit-msg': '#!/bin/sh\nprintf commit-msg > .git/commit-msg.ran\n',
    'post-commit': '#!/bin/sh\nprintf post-commit > .git/post-commit.ran\n',
    'pre-commit': '#!/bin/sh\ngit diff --cached --name-only > .git/pre-commit.paths\n',
    'prepare-commit-msg': '#!/bin/sh\nprintf prepare-commit-msg > .git/prepare-commit-msg.ran\n',
  };
  await Promise.all(Object.entries(hooks).map(async ([name, source]) => {
    const path = join(hooksDirectory, name);
    await writeFile(path, source);
    await chmod(path, 0o755);
  }));
  await Promise.all([
    writeFile(join(fixture.repository, 'approved.txt'), 'approved changed\n'),
    writeFile(join(fixture.repository, 'extra.txt'), 'extra changed\n'),
  ]);

  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  assert.equal(git(fixture.repository, ['diff', '--cached', '--name-only']), '');
  const commit = fixture.invoke(['commit', 'fix: commit approved content']);
  assert.equal(commit.status, 0, commit.stderr);

  const newHead = git(fixture.repository, ['rev-parse', 'HEAD']);
  assert.notEqual(newHead, fixture.expectedHead);
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD^']), fixture.expectedHead);
  assert.equal(git(fixture.repository, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']), 'approved.txt');
  assert.equal(git(fixture.repository, ['show', 'HEAD:approved.txt']), 'approved changed');
  assert.equal(git(fixture.repository, ['show', 'HEAD:extra.txt']), 'extra baseline');
  assert.equal(git(fixture.repository, ['show', '-s', '--format=%an:%ae|%cn:%ce', 'HEAD']),
    'Todo Eight Test:todo8@example.test|Todo Eight Test:todo8@example.test');
  assert.equal(git(fixture.repository, ['diff', '--cached', '--name-only']), '');
  assert.equal(git(fixture.repository, ['status', '--short']), 'M extra.txt');
  assert.equal(await readFile(join(fixture.repository, '.git', 'pre-commit.paths'), 'utf8'), 'approved.txt\n');
  await Promise.all(['commit-msg', 'post-commit', 'prepare-commit-msg'].map(async (name) => {
    assert.equal(await readFile(join(fixture.repository, '.git', `${name}.ran`), 'utf8'), name);
  }));

  const replay = fixture.invoke(['commit', 'fix: replay']);
  assert.notEqual(replay.status, 0);
});

test('real VCS wrapper commits successfully when standard hooks are absent', async (context) => {
  const fixture = await createDisposableRepository(context);
  await writeFile(join(fixture.repository, 'approved.txt'), 'approved changed without hooks\n');
  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  const commit = fixture.invoke(['commit', 'fix: commit without hooks']);
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(git(fixture.repository, ['show', 'HEAD:approved.txt']), 'approved changed without hooks');
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD^']), fixture.expectedHead);
});

test('real VCS wrapper preserves an executable pre-commit veto', async (context) => {
  const fixture = await createDisposableRepository(context);
  const hookPath = join(fixture.repository, '.git', 'hooks', 'pre-commit');
  await writeFile(hookPath, '#!/bin/sh\nexit 42\n');
  await chmod(hookPath, 0o755);
  await writeFile(join(fixture.repository, 'approved.txt'), 'vetoed change\n');
  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  const commit = fixture.invoke(['commit', 'fix: vetoed commit']);
  assert.notEqual(commit.status, 0);
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD']), fixture.expectedHead);
});

test('real VCS wrapper reports committed success when approved-manifest cleanup fails after publication', async (context) => {
  const fixture = await createDisposableRepository(context);
  const manifestPath = join(fixture.repository, '.git', 'ilokesto-implementer-approved-index.json');
  const privateIndexPath = join(fixture.repository, '.git', 'ilokesto-implementer.index');
  const primaryIndexLockPath = join(fixture.repository, '.git', 'index.lock');
  const hookPath = join(fixture.repository, '.git', 'hooks', 'pre-commit');
  await writeFile(hookPath, `#!/bin/sh\nrm ${JSON.stringify(manifestPath)}\nmkdir ${JSON.stringify(manifestPath)}\n`);
  await chmod(hookPath, 0o755);
  await writeFile(join(fixture.repository, 'approved.txt'), 'approved changed with cleanup anomaly\n');

  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  const commit = fixture.invoke(['commit', 'fix: preserve committed success']);

  assert.equal(commit.status, 0, commit.stderr);
  const newHead = git(fixture.repository, ['rev-parse', 'HEAD']);
  assert.notEqual(newHead, fixture.expectedHead);
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD^']), fixture.expectedHead);
  assert.equal(git(fixture.repository, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']), 'approved.txt');
  await access(manifestPath);
  await assert.rejects(access(privateIndexPath));
  await assert.rejects(access(primaryIndexLockPath));
});

test('real VCS wrapper reports failure and preserves the branch when the same cleanup anomaly precedes publication', async (context) => {
  const fixture = await createDisposableRepository(context);
  const manifestPath = join(fixture.repository, '.git', 'ilokesto-implementer-approved-index.json');
  const hookPath = join(fixture.repository, '.git', 'hooks', 'pre-commit');
  await writeFile(hookPath, `#!/bin/sh\nrm ${JSON.stringify(manifestPath)}\nmkdir ${JSON.stringify(manifestPath)}\nexit 42\n`);
  await chmod(hookPath, 0o755);
  await writeFile(join(fixture.repository, 'approved.txt'), 'vetoed cleanup anomaly\n');

  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  const commit = fixture.invoke(['commit', 'fix: reject pre-publication anomaly']);

  assert.notEqual(commit.status, 0);
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD']), fixture.expectedHead);
});

test('real VCS wrapper rejects pre-populated primary index and missing or malformed manifests', async (context) => {
  const fixture = await createDisposableRepository(context);
  await Promise.all([
    writeFile(join(fixture.repository, 'approved.txt'), 'approved changed\n'),
    writeFile(join(fixture.repository, 'extra.txt'), 'extra changed\n'),
  ]);
  git(fixture.repository, ['add', '--', 'extra.txt']);
  const prepopulated = fixture.invoke(['stage', 'approved.txt']);
  assert.notEqual(prepopulated.status, 0);
  assert.match(prepopulated.stderr, /primary index must be clean/u);
  git(fixture.repository, ['reset', '--mixed', fixture.expectedHead]);

  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  const gitDirectory = resolve(fixture.repository, git(fixture.repository, ['rev-parse', '--git-dir']));
  const manifestPath = join(gitDirectory, 'ilokesto-implementer-approved-index.json');
  const manifest = await readFile(manifestPath, 'utf8');
  git(fixture.repository, ['add', '--', 'extra.txt']);
  const racedPrimaryIndex = fixture.invoke(['commit', 'fix: raced primary index']);
  assert.notEqual(racedPrimaryIndex.status, 0);
  assert.match(racedPrimaryIndex.stderr, /primary index must be clean/u);
  git(fixture.repository, ['reset', '--mixed', fixture.expectedHead]);
  await rm(manifestPath);
  const missing = fixture.invoke(['commit', 'fix: missing manifest']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /requires wrapper-approved stage state/u);
  await writeFile(manifestPath, '{');
  const malformed = fixture.invoke(['commit', 'fix: malformed manifest']);
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /approved-index state is invalid/u);
  const parsed = JSON.parse(manifest);
  await writeFile(manifestPath, JSON.stringify({ ...parsed, branch_ref: 'refs/heads/issue-999-other' }));
  const mismatchedRef = fixture.invoke(['commit', 'fix: mismatched ref']);
  assert.notEqual(mismatchedRef.status, 0);
  assert.match(mismatchedRef.stderr, /approved-index state is invalid/u);
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD']), fixture.expectedHead);
});

test('real Git update-ref CAS rejects a raced branch without changing the winner', async (context) => {
  const fixture = await createDisposableRepository(context);
  const tree = git(fixture.repository, ['rev-parse', 'HEAD^{tree}']);
  const candidate = git(fixture.repository, ['commit-tree', tree, '-p', fixture.expectedHead, '-m', 'candidate']);
  const raced = git(fixture.repository, ['commit-tree', tree, '-p', fixture.expectedHead, '-m', 'race winner']);
  git(fixture.repository, ['update-ref', 'refs/heads/issue-123-test', raced, fixture.expectedHead]);

  assert.throws(() => updateBranchAtomically(
    fixture.repository,
    'refs/heads/issue-123-test',
    candidate,
    fixture.expectedHead,
  ));
  assert.equal(git(fixture.repository, ['rev-parse', 'refs/heads/issue-123-test']), raced);
});

test('real VCS wrapper rejects a hard-linked approved private index', async (context) => {
  const fixture = await createDisposableRepository(context);
  await writeFile(join(fixture.repository, 'approved.txt'), 'approved changed\n');
  const stage = fixture.invoke(['stage', 'approved.txt']);
  assert.equal(stage.status, 0, stage.stderr);
  const gitDirectory = resolve(fixture.repository, git(fixture.repository, ['rev-parse', '--git-dir']));
  await link(
    join(gitDirectory, 'ilokesto-implementer.index'),
    join(gitDirectory, 'ilokesto-implementer.index.alias'),
  );
  const commit = fixture.invoke(['commit', 'fix: reject linked private index']);
  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /approved private index is invalid/u);
  assert.equal(git(fixture.repository, ['rev-parse', 'HEAD']), fixture.expectedHead);
});

test('Darwin verifier sandbox confines writes, denies host reads, and exposes only the minimal environment', async (context) => {
  if (process.platform !== 'darwin') {
    context.skip('sandbox-exec verifier support is intentionally Darwin-only');
    return;
  }
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'ilokesto-sandbox-'));
  const worktreePath = join(repositoryRoot, '.worktrees', 'issue-123-test');
  const siblingPath = join(repositoryRoot, '.worktrees', 'issue-124-sibling');
  const inside = join(worktreePath, 'inside.txt');
  const outside = join(repositoryRoot, 'outside.txt');
  const sibling = join(siblingPath, 'outside.txt');
  const linkedOutside = join(worktreePath, 'linked-sibling', 'outside.txt');
  const assignedReadable = join(worktreePath, 'assigned-readable.txt');
  const trustedRoot = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
  const trustedReadable = join(trustedRoot, 'packages', 'store', 'vitest.config.ts');
  const homeFixture = await mkdtemp(join(homedir(), '.ilokesto-todo8-credential-'));
  const homeCredential = join(homeFixture, 'auth.json');
  const arbitraryHostFile = '/etc/hosts';
  const deniedCopies = ['supervisor-copy', 'sibling-copy', 'home-copy', 'host-copy', 'linked-copy']
    .map((name) => join(worktreePath, name));
  context.after(() => rm(homeFixture, { force: true, recursive: true }));
  await Promise.all([
    mkdir(worktreePath, { recursive: true }),
    mkdir(siblingPath, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(assignedReadable, 'assigned-readable'),
    writeFile(outside, 'supervisor-secret'),
    writeFile(sibling, 'sibling-secret'),
    writeFile(homeCredential, 'home-credential-secret'),
  ]);
  await symlink(siblingPath, join(worktreePath, 'linked-sibling'));
  const secretName = 'TODO8_SENTINEL_SECRET';
  process.env[secretName] = 'must-not-cross-boundary';
  const environment = createVerifierEnvironment(worktreePath, worktreePath, process.execPath);
  const executables = {
    bun: await realpath(process.execPath),
    node: await realpath(process.execPath),
    opencode: await realpath(process.execPath),
    pnpm: await realpath(process.execPath),
  };
  const readGrant = await createVerifierReadGrant(
    trustedRoot,
    executables,
    getVerificationPlan(scopedRole, 'store', 'test'),
  );
  assert.throws(() => createSandboxPolicy(process.execPath, {
    readGrant,
    readPaths: [arbitraryHostFile],
    worktreePath,
  }), /raw sandbox read paths are forbidden/u);
  const policy = createSandboxPolicy(process.execPath, {
    readGrant,
    worktreePath,
  });
  assert.doesNotMatch(policy, /\(allow file-read\*\)/u);
  assert.match(policy, /\(allow file-read-metadata\)/u);
  assert.match(policy, /\(allow file-read-data/u);
  assert.doesNotMatch(policy, /\/etc\/hosts|\.ilokesto-todo8-credential-/u);
  const source = `
    import { readFileSync, writeFileSync } from 'node:fs';
    const payload = JSON.parse(process.argv.at(-1));
    const { inside, assignedReadable, trustedReadable, deniedReads, deniedWrites } = payload;
    writeFileSync(inside, JSON.stringify({ keys: Object.keys(process.env).sort(), secret: process.env.${secretName} }));
    if (readFileSync(assignedReadable, 'utf8') !== 'assigned-readable') process.exit(90);
    if (!readFileSync(trustedReadable, 'utf8').includes('defineConfig')) process.exit(91);
    for (const [source, copy] of deniedReads) {
      let denied = false;
      try { writeFileSync(copy, readFileSync(source)); } catch (error) { denied = error?.code === 'EPERM' || error?.code === 'EACCES'; }
      if (!denied) process.exit(92);
    }
    for (const target of deniedWrites) {
      let denied = false;
      try { writeFileSync(target, 'forbidden'); } catch (error) { denied = error?.code === 'EPERM'; }
      if (!denied) process.exit(93);
    }
  `;
  const payload = JSON.stringify({
    assignedReadable,
    deniedReads: [
      [outside, deniedCopies[0]],
      [sibling, deniedCopies[1]],
      [homeCredential, deniedCopies[2]],
      [arbitraryHostFile, deniedCopies[3]],
      [linkedOutside, deniedCopies[4]],
    ],
    deniedWrites: [outside, sibling, linkedOutside],
    inside,
    trustedReadable,
  });
  try {
    runSandboxedFile(process.execPath, ['--input-type=module', '--eval', source, payload], {
      cwd: worktreePath,
      env: environment,
      readGrant,
      stdio: 'inherit',
      worktreePath,
    });
  } finally {
    delete process.env[secretName];
  }
  const observed = JSON.parse(await readFile(inside, 'utf8'));
  assert.equal(observed.secret, undefined);
  assert.deepEqual(observed.keys.filter((key) => key !== '__CF_USER_TEXT_ENCODING'), Object.keys(environment).sort());
  assert.notEqual(environment.PATH, process.env.PATH);
  assert.equal(Object.keys(environment).some((key) => /token|secret|credential|auth|session|cookie|key|opencode|node_options|bun_options|git_/iu.test(key)), false);
  assert.equal(await readFile(outside, 'utf8'), 'supervisor-secret');
  assert.equal(await readFile(sibling, 'utf8'), 'sibling-secret');
  assert.equal(await readFile(linkedOutside, 'utf8'), 'sibling-secret');
  for (const copy of deniedCopies) await assert.rejects(access(copy));
});

test('verifier mapping is immutable and rejects package script mutation', async () => {
  assert.deepEqual(getVerificationPlan(scopedRole, 'store', 'typecheck'), [
    { command: 'pnpm', args: ['--filter', '@ilokesto/store', 'exec', 'tsc', '--noEmit'], operation: 'spawn', packageName: 'store' },
    { command: 'pnpm', args: ['--filter', '@ilokesto/store', 'exec', 'tsc', '--project', 'tsconfig.typecheck.json'], operation: 'spawn', packageName: 'store' },
  ]);
  assert.equal(getVerificationPlan(scopedRole, 'store', 'test')[0].config, 'vitest.config.ts');
  assert.deepEqual(getVerificationPlan(scopedRole, 'fetcher', 'test:dist')[0].dependencies, [
    'scripts/verify-packed-dist.mjs',
  ]);
  assert.throws(() => getVerificationPlan(scopedRole, 'modal', 'test'));
  assert.throws(() => getVerificationPlan(scopedRole, 'store', 'publish'));

  const repositoryRoot = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
  const executables = {
    bun: await realpath(process.execPath),
    node: await realpath(process.execPath),
    opencode: await realpath(process.execPath),
    pnpm: await realpath(process.execPath),
  };
  const readGrant = await createVerifierReadGrant(
    repositoryRoot,
    executables,
    getVerificationPlan(scopedRole, 'store', 'test'),
  );
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-verifier-'));
  const policy = createSandboxPolicy(process.execPath, {
    readGrant,
    worktreePath: root,
  });
  assert.doesNotMatch(policy, new RegExp(`\\(subpath ${JSON.stringify(repositoryRoot).replaceAll('/', '\\/')}\\)`, 'u'));
  assert.match(policy, new RegExp(JSON.stringify(await realpath(join(repositoryRoot, 'node_modules'))).replaceAll('/', '\\/'), 'u'));
  assert.match(policy, new RegExp(JSON.stringify(await realpath(join(repositoryRoot, 'packages', 'store', 'vitest.config.ts'))).replaceAll('/', '\\/'), 'u'));
  assert.match(policy, new RegExp(JSON.stringify(await realpath(join(repositoryRoot, 'packages', 'store', 'node_modules'))).replaceAll('/', '\\/'), 'u'));

  const trusted = join(root, 'trusted.mjs');
  const assigned = join(root, 'assigned.mjs');
  await writeFile(trusted, 'export const value = 1;\n');
  await writeFile(assigned, 'export const value = 1;\n');
  await validateTrustedScript(trusted, assigned);
  await writeFile(assigned, 'process.exit(99);\n');
  await assert.rejects(validateTrustedScript(trusted, assigned));
});

test('every allowed verifier plan carries exact package identity before read-grant construction', () => {
  for (const [role, packages] of Object.entries(verifierMatrix)) {
    for (const [packageName, verifiers] of Object.entries(packages)) {
      for (const verifier of verifiers) {
        const plan = getVerificationPlan(role, packageName, verifier);
        assert.ok(plan.length > 0, `${role}/${packageName}/${verifier} must have steps`);
        for (const step of plan) {
          assert.equal(step.packageName, packageName, `${role}/${packageName}/${verifier}: ${JSON.stringify(step)}`);
          if (step.command === 'pnpm') assert.equal(step.args[1], `@ilokesto/${packageName}`);
        }
      }
    }
  }
});

test('installed OpenCode resolves reviewer allowlist and fixed child override in order', () => {
  const repositoryRoot = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
  const workflowRoot = join(repositoryRoot, 'scripts', 'workflow');
  const child = spawnSync('opencode', ['debug', 'agent', scopedRole], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, OPENCODE_CONFIG_CONTENT: JSON.stringify(createChildConfig(scopedRole, workflowRoot)) },
    shell: false,
  });
  assert.equal(child.status, 0, child.stderr);
  const childAgent = JSON.parse(child.stdout);
  const childPermissions = childAgent.permission;
  const lastAction = (permission, pattern) => childPermissions
    .filter((entry) => entry.permission === permission && entry.pattern === pattern)
    .at(-1)?.action;
  assert.equal(lastAction('edit', '*'), 'allow');
  assert.equal(lastAction('external_directory', '*'), 'deny');
  assert.equal(lastAction('bash', `node ${workflowRoot}/implementer-vcs.mjs stage *`), 'allow');
  assert.equal(lastAction('bash', '*;*'), 'deny');

  const supervisor = spawnSync('opencode', ['debug', 'agent', 'ilokesto-workflow-supervisor'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  });
  assert.equal(supervisor.status, 0, supervisor.stderr);
  const supervisorPermissions = JSON.parse(supervisor.stdout).permission;
  const taskRules = supervisorPermissions.filter((entry) => entry.permission === 'task');
  assert.deepEqual(taskRules.slice(-6).map(({ pattern, action }) => [pattern, action]), [
    ['*', 'deny'],
    ['ilokesto-contract-reviewer', 'allow'],
    ['ilokesto-code-reviewer', 'allow'],
    ['ilokesto-verification-reviewer', 'allow'],
    ['ilokesto-docs-release-reviewer', 'allow'],
    ['ilokesto-issue-registration-reviewer', 'allow'],
  ]);
});
