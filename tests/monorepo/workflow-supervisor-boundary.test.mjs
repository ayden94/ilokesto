import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { LaneLedgerError } from '../../scripts/workflow/lane-ledger.mjs';
import { parseIssueBranch, parseIssueBranchRef, parseIssueWorktree } from '../../scripts/workflow/issue-branch.mjs';
import { runSupervisorBoundary } from '../../scripts/workflow/supervisor-boundary.mjs';
import { laneCreation, receipt } from './workflow-e2e-fixtures.mjs';

const cliPath = fileURLToPath(new URL('../../scripts/workflow/lane-ledger-cli.mjs', import.meta.url));
const runtimeEnvironment = Object.fromEntries(
  ['HOME', 'LANG', 'LC_ALL', 'PATH', 'TMPDIR'].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]),
);

function runCli(root, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: runtimeEnvironment,
    shell: false,
  });
}

async function workspace(context, laneId) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'ilokesto-supervisor-boundary-')));
  context.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all([
    mkdir(join(root, '.omo', 'inbox'), { recursive: true }),
    mkdir(join(root, '.omo', 'lanes'), { recursive: true }),
  ]);
  const initialized = spawnSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: root, env: runtimeEnvironment, shell: false });
  assert.equal(initialized.status, 0, initialized.stderr);
  return root;
}

function fakeAdapter(handler) {
  const calls = [];
  return {
    calls,
    run(file, args, cwd) {
      calls.push([file, args, cwd]);
      return handler(file, args, calls);
    },
  };
}

function repositoryInspection(args, root) {
  if (args.join(' ') === 'rev-parse --show-toplevel') return root;
  if (args.join(' ') === 'config --get remote.origin.url') return 'git@github.com:ilokesto/ilokesto.git';
  return null;
}

function assertBoundaryError(error) {
  return error instanceof LaneLedgerError && error.code === 'ERR_SIDE_EFFECT_PRECONDITION';
}

test('issue branch parsers reject unsafe decimal text before canonical number binding', () => {
  const largestSafeBranch = `issue-${String(Number.MAX_SAFE_INTEGER)}-test`;
  assert.equal(parseIssueBranch(largestSafeBranch, Number.MAX_SAFE_INTEGER)?.issueNumber, Number.MAX_SAFE_INTEGER);

  const unsafeBranch = 'issue-9007199254740993-test';
  assert.equal(parseIssueBranch(unsafeBranch), null);
  assert.equal(parseIssueBranch(unsafeBranch, 9007199254740992), null);
  assert.equal(parseIssueBranchRef(`refs/heads/${unsafeBranch}`), null);
  assert.equal(parseIssueWorktree(`.worktrees/${unsafeBranch}`), null);
});

test('ledger CLI create and transition consume one direct canonical inbox file without stdin', async (context) => {
  const laneId = 'lane-direct-receipt';
  const root = await workspace(context, laneId);
  const creation = laneCreation(laneId);
  const createPath = '.omo/inbox/lane-direct-receipt-create.json';
  await writeFile(join(root, createPath), JSON.stringify(creation));

  const created = runCli(root, ['create', laneId, createPath]);
  assert.equal(created.status, 0, created.stderr);

  const transitionPath = '.omo/inbox/lane-direct-receipt-transition.json';
  await writeFile(join(root, transitionPath), JSON.stringify(receipt(laneId, 'workflow.started', 1, { item_id: null })));
  const transitioned = runCli(root, ['transition', laneId, '--expected-revision', '1', transitionPath]);
  assert.equal(transitioned.status, 0, transitioned.stderr);
  assert.equal(JSON.parse(transitioned.stdout).projection.workflow_state, 'running');
});

test('ledger CLI rejects stdin-only create and unexpected receipt flags', async (context) => {
  const laneId = 'lane-receipt-arguments';
  const root = await workspace(context, laneId);
  const creation = laneCreation(laneId);

  const stdinOnly = spawnSync(process.execPath, [cliPath, 'create', laneId], {
    cwd: root,
    encoding: 'utf8',
    env: runtimeEnvironment,
    input: JSON.stringify(creation),
    shell: false,
  });
  assert.equal(stdinOnly.status, 1);
  assert.match(stdinOnly.stderr, /^ERR_INVALID_SCHEMA:/u);

  const path = '.omo/inbox/lane-receipt-arguments.json';
  await writeFile(join(root, path), JSON.stringify(creation));
  const extraFlag = runCli(root, ['create', laneId, path, '--root', root]);
  assert.equal(extraFlag.status, 1);
  assert.match(extraFlag.stderr, /^ERR_INVALID_SCHEMA:/u);
});

test('ledger CLI rejects unsafe authorization issue numbers during argument parsing', async (context) => {
  const root = await workspace(context, 'lane-unsafe-authority');
  const result = runCli(root, [
    'authorize',
    'lane-unsafe-authority',
    '--expected-revision', '1',
    '--repository', 'ilokesto/ilokesto',
    '--issues', '9007199254740992',
    '--operations', 'merge',
    '--squash-method', 'squash',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /^ERR_INVALID_SCHEMA: authorize issue scope does not match its operation/u);
});

test('ledger CLI receipt input rejects traversal absolute nested symlink and FIFO paths', async (context) => {
  const laneId = 'lane-receipt-paths';
  const root = await workspace(context, laneId);
  const creation = laneCreation(laneId);
  const outside = join(root, 'outside-secret.json');
  await writeFile(outside, JSON.stringify(creation));
  await symlink(outside, join(root, '.omo', 'inbox', 'linked.json'));
  const fifo = join(root, '.omo', 'inbox', 'receipt.fifo');
  const fifoResult = spawnSync('mkfifo', [fifo], { cwd: root, encoding: 'utf8', env: runtimeEnvironment, shell: false });
  assert.equal(fifoResult.status, 0, fifoResult.stderr);

  const rejected = [
    '../outside-secret.json',
    outside,
    '.omo/../../outside-secret.json',
    '.omo/inbox/nested/../outside-secret.json',
    '.omo/inbox/linked.json',
    '.omo/inbox/receipt.fifo',
  ];
  for (const path of rejected) {
    const result = runCli(root, ['create', laneId, path]);
    assert.equal(result.status, 1, path);
    assert.match(result.stderr, /^ERR_(?:PATH_OUTSIDE_ROOT|PATH_SYMLINK|INVALID_TARGET_TYPE):/u, path);
  }
});

test('branch push binds one issue branch to the exact local SHA and reinspects the remote ref', async (context) => {
  const root = await workspace(context, 'lane-branch-push');
  const sha = 'a'.repeat(40);
  let remoteInspections = 0;
  const adapter = fakeAdapter((file, args) => {
    assert.equal(file, 'git');
    const repositoryResult = repositoryInspection(args, root);
    if (repositoryResult !== null) return repositoryResult;
    if (args.join(' ') === 'rev-parse --verify refs/heads/issue-101-test') return sha;
    if (args.join(' ') === 'ls-remote --heads origin refs/heads/issue-101-test') {
      remoteInspections += 1;
      return remoteInspections === 1 ? '' : `${sha}\trefs/heads/issue-101-test`;
    }
    if (args[2] === 'push') {
      assert.deepEqual(args, ['-c', 'core.hooksPath=/dev/null', 'push', 'origin', 'refs/heads/issue-101-test:refs/heads/issue-101-test']);
      return '';
    }
    throw new Error(`unexpected command: ${args.join(' ')}`);
  });

  const result = runSupervisorBoundary(['branch-push', 'ilokesto/ilokesto', 'issue-101-test', sha], { workspace: root, adapter });

  assert.equal(result.effect, 'pushed');
  assert.equal(remoteInspections, 2);
});

test('base worktree binds origin base SHA and creates one non-existing issue worktree', async (context) => {
  const root = await workspace(context, 'lane-base-worktree');
  await mkdir(join(root, '.worktrees'));
  const sha = 'b'.repeat(40);
  const adapter = fakeAdapter((file, args) => {
    assert.equal(file, 'git');
    const repositoryResult = repositoryInspection(args, root);
    if (repositoryResult !== null) return repositoryResult;
    if (args.join(' ') === 'ls-remote --heads origin refs/heads/main') return `${sha}\trefs/heads/main`;
    if (args.join(' ') === 'branch --list issue-101-test') return '';
    if (args.join(' ') === 'worktree list --porcelain') return `worktree ${root}`;
    if (args.join(' ') === 'fetch origin refs/heads/main') return '';
    if (args.join(' ') === 'rev-parse FETCH_HEAD') return sha;
    if (args[2] === 'worktree' && args[3] === 'add') {
      assert.deepEqual(args, ['-c', 'core.hooksPath=/dev/null', 'worktree', 'add', '-b', 'issue-101-test', join(root, '.worktrees', 'issue-101-test'), sha]);
      return '';
    }
    if (args[0] === '-C' && args[2] === 'branch') return 'issue-101-test';
    if (args[0] === '-C' && args[2] === 'rev-parse') return sha;
    throw new Error(`unexpected command: ${args.join(' ')}`);
  });

  const result = runSupervisorBoundary(['base-worktree', 'ilokesto/ilokesto', 'main', sha, 'issue-101-test', '.worktrees/issue-101-test'], { workspace: root, adapter });

  assert.equal(result.base_sha, sha);
  assert.equal(result.worktree, '.worktrees/issue-101-test');
});

test('PR create binds repository base branch head issue and canonical inbox title and body', async (context) => {
  const root = await workspace(context, 'lane-pr-create');
  const sha = 'c'.repeat(40);
  await Promise.all([
    writeFile(join(root, '.omo', 'inbox', 'pr-title.txt'), 'Fix the workflow boundary'),
    writeFile(join(root, '.omo', 'inbox', 'pr-body.md'), 'Closes #101\n'),
  ]);
  const adapter = fakeAdapter((file, args) => {
    const repositoryResult = file === 'git' ? repositoryInspection(args, root) : null;
    if (repositoryResult !== null) return repositoryResult;
    if (file === 'git' && args.join(' ') === 'rev-parse --verify refs/heads/issue-101-test') return sha;
    if (file === 'git' && args.join(' ') === 'ls-remote --heads origin refs/heads/issue-101-test') return `${sha}\trefs/heads/issue-101-test`;
    if (file === 'gh' && args[0] === 'pr' && args[1] === 'list') return '[]';
    if (file === 'gh' && args[0] === 'pr' && args[1] === 'create') {
      assert.deepEqual(args, ['pr', 'create', '--repo', 'ilokesto/ilokesto', '--head', 'issue-101-test', '--base', 'main', '--title', 'Fix the workflow boundary', '--body', 'Closes #101\n']);
      return 'https://github.com/ilokesto/ilokesto/pull/51';
    }
    if (file === 'gh' && args[0] === 'pr' && args[1] === 'view') return JSON.stringify({ number: 51, baseRefName: 'main', headRefName: 'issue-101-test', headRefOid: sha, body: 'Closes #101\n', url: 'https://github.com/ilokesto/ilokesto/pull/51' });
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const result = runSupervisorBoundary(['pr-create', 'ilokesto/ilokesto', 'main', 'issue-101-test', sha, '101', '.omo/inbox/pr-title.txt', '.omo/inbox/pr-body.md'], { workspace: root, adapter });

  assert.equal(result.pr_number, 51);
  assert.equal(result.issue_number, 101);
});

test('supervisor boundary rejects extra PR flags path escapes and mismatched origin before mutation', async (context) => {
  const root = await workspace(context, 'lane-boundary-rejections');
  const sha = 'd'.repeat(40);
  const noCalls = fakeAdapter(() => { throw new Error('adapter must not run'); });
  assert.throws(
    () => runSupervisorBoundary(['pr-create', 'ilokesto/ilokesto', 'main', 'issue-101-test', sha, '101', '.omo/inbox/title.txt', '.omo/inbox/body.md', '--draft'], { workspace: root, adapter: noCalls }),
    assertBoundaryError,
  );
  assert.throws(
    () => runSupervisorBoundary(['pr-create', 'ilokesto/ilokesto', 'main', 'issue-101-test', sha, '101', '.omo/../../outside-secret', '.omo/inbox/body.md'], { workspace: root, adapter: noCalls }),
    (error) => error instanceof LaneLedgerError && error.code === 'ERR_PATH_OUTSIDE_ROOT',
  );
  const wrongOrigin = fakeAdapter((file, args) => {
    assert.equal(file, 'git');
    if (args.join(' ') === 'rev-parse --show-toplevel') return root;
    if (args.join(' ') === 'config --get remote.origin.url') return 'https://github.com/other/repository.git';
    throw new Error('mutation must not run');
  });
  assert.throws(
    () => runSupervisorBoundary(['branch-push', 'ilokesto/ilokesto', 'issue-101-test', sha], { workspace: root, adapter: wrongOrigin }),
    assertBoundaryError,
  );
  assert.equal(wrongOrigin.calls.length, 2);
});

test('supervisor boundary accepts only lowercase kebab issue branches bound to the exact PR issue', async (context) => {
  const root = await workspace(context, 'lane-branch-contract');
  const sha = 'e'.repeat(40);
  await Promise.all([
    writeFile(join(root, '.omo', 'inbox', 'title.txt'), 'Branch contract'),
    writeFile(join(root, '.omo', 'inbox', 'body.md'), 'Closes #101\n'),
  ]);
  const noCalls = fakeAdapter(() => { throw new Error('adapter must not run'); });
  for (const branch of ['issue-no-number', 'issue-101', 'issue-101-Upper', 'issue-101-two_parts', 'issue-102-test']) {
    assert.throws(
      () => runSupervisorBoundary(['pr-create', 'ilokesto/ilokesto', 'main', branch, sha, '101', '.omo/inbox/title.txt', '.omo/inbox/body.md'], { workspace: root, adapter: noCalls }),
      assertBoundaryError,
      branch,
    );
  }
  assert.deepEqual(noCalls.calls, []);
});

test('PR create rejects unsafe issue precision collisions before adapter mutation', async (context) => {
  const root = await workspace(context, 'lane-pr-unsafe-issue');
  const sha = 'f'.repeat(40);
  await Promise.all([
    writeFile(join(root, '.omo', 'inbox', 'unsafe-title.txt'), 'Reject unsafe issue identity'),
    writeFile(join(root, '.omo', 'inbox', 'unsafe-body.md'), 'Closes #9007199254740992\n'),
  ]);
  const adapter = fakeAdapter(() => { throw new Error('adapter must not run'); });

  assert.throws(
    () => runSupervisorBoundary([
      'pr-create',
      'ilokesto/ilokesto',
      'main',
      'issue-9007199254740993-test',
      sha,
      '9007199254740992',
      '.omo/inbox/unsafe-title.txt',
      '.omo/inbox/unsafe-body.md',
    ], { workspace: root, adapter }),
    assertBoundaryError,
  );
  assert.deepEqual(adapter.calls, []);
});
