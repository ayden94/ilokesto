import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { LaneLedgerError, validateReceipt } from '../../scripts/workflow/lane-ledger.mjs';
import { createSystemEffects, runWorkflowSideEffect } from '../../scripts/workflow/workflow-side-effect.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const CHECKS = [{ name: 'ci', run_id: 7001, status: 'PASS', head_sha: SHA_A }];
const REPOSITORY = 'ilokesto/ilokesto';
const REMOTE_URL = `https://github.com/${REPOSITORY}.git`;

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function gitExit(cwd, args) {
  return spawnSync('git', args, { cwd, stdio: 'ignore' }).status;
}

async function disposableRepository(context) {
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-side-effect-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git');
  const workspace = join(root, 'workspace');
  const worktree = join(workspace, '.worktrees', 'issue-101-test');
  await mkdir(workspace, { recursive: true });
  git(root, ['init', '--bare', remote]);
  git(workspace, ['init', '-b', 'main']);
  git(workspace, ['config', 'user.name', 'Workflow Test']);
  git(workspace, ['config', 'user.email', 'workflow@example.test']);
  await writeFile(join(workspace, 'README.md'), 'base\n');
  await writeFile(join(workspace, '.gitignore'), '.worktrees/\n');
  git(workspace, ['add', 'README.md', '.gitignore']);
  git(workspace, ['commit', '-m', 'base']);
  git(workspace, ['remote', 'add', 'origin', REMOTE_URL]);
  git(workspace, ['config', `url.file://${remote}.insteadOf`, REMOTE_URL]);
  git(workspace, ['push', '-u', 'origin', 'main']);
  await mkdir(join(workspace, '.worktrees'), { recursive: true });
  git(workspace, ['worktree', 'add', '-b', 'issue-101-test', worktree, 'main']);
  await writeFile(join(worktree, 'feature.txt'), 'feature\n');
  git(worktree, ['add', 'feature.txt']);
  git(worktree, ['commit', '-m', 'feature']);
  const headSha = git(worktree, ['rev-parse', 'HEAD']);
  git(worktree, ['push', '-u', 'origin', 'issue-101-test']);
  git(worktree, ['branch', '--unset-upstream']);
  git(workspace, ['merge', '--squash', 'issue-101-test']);
  git(workspace, ['commit', '-m', 'squash feature']);
  const mergeSha = git(workspace, ['rev-parse', 'HEAD']);
  git(workspace, ['push', 'origin', 'main']);
  return { root, remote, workspace, worktree, headSha, mergeSha };
}

async function advanceRemote(repository, message) {
  const clone = join(repository.root, `updater-${message}`);
  git(repository.root, ['clone', '--branch', 'main', repository.remote, clone]);
  git(clone, ['config', 'user.name', 'Workflow Test']);
  git(clone, ['config', 'user.email', 'workflow@example.test']);
  await writeFile(join(clone, `${message}.txt`), `${message}\n`);
  git(clone, ['add', `${message}.txt`]);
  git(clone, ['commit', '-m', message]);
  git(clone, ['push', 'origin', 'main']);
  return git(clone, ['rev-parse', 'HEAD']);
}

function projectionFor(operation, authority = {}) {
  const state = operation === 'merge' ? 'merge-ready' : operation === 'cleanup' ? 'cleanup-pending' : 'done';
  const consumed = authority.consumed_operations ?? [];
  return {
    version: 1,
    lane_id: 'lane-task-6',
    revision: operation === 'merge' ? 9 : operation === 'cleanup' ? 11 : 13,
    repository: 'ilokesto/ilokesto',
    base_branch: 'main',
    workflow_state: 'running',
    root_sync: 'pending',
    authority: authority.missing ? null : {
      repository: 'ilokesto/ilokesto',
      lane_id: 'lane-task-6',
      issues: operation === 'root-sync' ? [] : authority.issues ?? [101],
      operations: [operation],
      consumed_operations: consumed,
      receipt_id: authority.receipt_id ?? 'authority-task-6',
    },
    items: {
      'issue-101': {
        state,
        attempt: 1,
        dispatch_id: 'dispatch-101',
        issue_number: 101,
        issue_url: 'https://github.com/ilokesto/ilokesto/issues/101',
        branch: 'issue-101-test',
        worktree: '.worktrees/issue-101-test',
        pr_number: 101,
        head_sha: SHA_A,
        merge_sha: operation === 'merge' ? undefined : SHA_B,
        review: { receipt_id: 'review-task-6', checks: CHECKS, outcome: 'merge' },
      },
    },
  };
}

function requestFor(operation, overrides = {}) {
  return {
    operation,
    lane_id: 'lane-task-6',
    expected_revision: operation === 'merge' ? 9 : operation === 'cleanup' ? 11 : 13,
    authority_receipt_id: 'authority-task-6',
    ...(operation === 'root-sync' ? {} : { item_id: 'issue-101' }),
    ...overrides,
  };
}

function harness(operation, authority, projection = projectionFor(operation, authority)) {
  const calls = [];
  let locked = false;
  const ledger = {
    async withLockedLane(laneId, callback) {
      assert.equal(laneId, 'lane-task-6');
      assert.equal(locked, false);
      locked = true;
      try {
        return await callback({
          projection,
          append(receipt) {
            assert.equal(locked, true, 'outcome append must occur before lock release');
            validateReceipt(receipt);
            calls.push(['append', receipt]);
            return { projection, receipt };
          },
        });
      } finally {
        locked = false;
      }
    },
  };
  const effects = {
    async inspectMerge(input) { calls.push(['inspectMerge', input]); return { head_sha: SHA_A, checks: CHECKS, merged: false }; },
    async merge(input) { calls.push(['merge', input]); return { merge_sha: SHA_B }; },
    async inspectCleanup(input) { calls.push(['inspectCleanup', input]); return { merged: true, merge_sha: SHA_B, worktree_exists: true, local_branch_exists: true, remote_branch_exists: true, remote_branch_sha: SHA_A, tracked_conflicts: [], untracked_conflicts: [] }; },
    async cleanup(input) { calls.push(['cleanup', input]); return { complete: true, worktree_removed: true, local_branch_deleted: true, remote_branch_deleted: true, remote_branch_sha: null }; },
    async inspectRootSync(input) { calls.push(['inspectRootSync', input]); return { dirty: false, head_sha: SHA_B, remote_head_sha: SHA_C, fast_forward: true }; },
    async rootSync(input) { calls.push(['rootSync', input]); return { head_sha: SHA_C }; },
  };
  return { calls, ledger, effects, projection };
}

function assertCode(code) {
  return (error) => error instanceof LaneLedgerError && error.code === code;
}

test('system effects discover the canonical Git workspace when workspace is omitted', async () => {
  const repositoryRoot = await realpath(fileURLToPath(new URL('../..', import.meta.url)));
  assert.equal(await realpath(git(repositoryRoot, ['rev-parse', '--show-toplevel'])), repositoryRoot);
  const moduleUrl = new URL('../../scripts/workflow/workflow-side-effect.mjs', import.meta.url).href;
  const construction = spawnSync(process.execPath, [
    '--input-type=module',
    '-e',
    `import{createSystemEffects}from ${JSON.stringify(moduleUrl)};process.stdout.write(JSON.stringify(Object.keys(createSystemEffects()).sort()))`,
  ], { cwd: repositoryRoot, encoding: 'utf8', timeout: 2000 });

  assert.equal(construction.status, 0, construction.stderr);
  assert.deepEqual(JSON.parse(construction.stdout), ['cleanup', 'inspectCleanup', 'inspectMerge', 'inspectRootSync', 'merge', 'rootSync']);
});

for (const operation of ['merge', 'cleanup', 'root-sync']) {
  test(`${operation} rejects missing mismatched and consumed authority before external access`, async () => {
    const cases = [
      [{ missing: true }, 'ERR_AUTHORITY_MISSING'],
      [{ receipt_id: 'other-authority' }, 'ERR_AUTHORITY_MISMATCH'],
      ...(operation === 'root-sync' ? [] : [[{ issues: [102], consumed_operations: [`${operation}:102`] }, 'ERR_AUTHORITY_MISMATCH']]),
      [{ consumed_operations: [operation === 'root-sync' ? 'root-sync' : `${operation}:101`] }, 'ERR_AUTHORITY_CONSUMED'],
    ];
    for (const [authority, code] of cases) {
      const current = harness(operation, authority);
      await assert.rejects(
        runWorkflowSideEffect(requestFor(operation), { ledger: current.ledger, effects: current.effects }),
        assertCode(code),
      );
      assert.deepEqual(current.calls, [], `${operation} ${code} must have zero external or append calls`);
    }
  });
}

test('merge rechecks live head and checks immediately before squash merge and appends under lock', async () => {
  const current = harness('merge');
  const result = await runWorkflowSideEffect(requestFor('merge'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'merge-task-6' });

  assert.deepEqual(current.calls.map(([name]) => name), ['inspectMerge', 'merge', 'append']);
  assert.equal(result.receipt.event, 'merge.completed');
  assert.equal(result.receipt.payload.merge_sha, SHA_B);
  assert.equal(result.receipt.payload.authority_receipt_id, 'authority-task-6');
});

test('merge stale head and failed checks deny mutation and outcome append', async () => {
  for (const live of [
    { head_sha: SHA_C, checks: CHECKS, merged: false },
    { head_sha: SHA_A, checks: [{ ...CHECKS[0], status: 'FAIL' }], merged: false },
  ]) {
    const current = harness('merge');
    current.effects.inspectMerge = async (input) => { current.calls.push(['inspectMerge', input]); return live; };
    await assert.rejects(runWorkflowSideEffect(requestFor('merge'), current), assertCode(live.head_sha === SHA_C ? 'ERR_STALE_HEAD' : 'ERR_SIDE_EFFECT_PRECONDITION'));
    assert.deepEqual(current.calls.map(([name]) => name), ['inspectMerge']);
  }
});

test('merge adapter receives the reviewed head for server-side compare-and-merge', async () => {
  const current = harness('merge');
  await runWorkflowSideEffect(requestFor('merge'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'merge-bound-task-6' });
  const mergeInput = current.calls.find(([name]) => name === 'merge')[1];
  assert.equal(mergeInput.expected_head_sha, SHA_A);
  assert.deepEqual(mergeInput.checks, CHECKS);
});

test('cleanup blocks dirty worktrees without cleanup mutation and appends conflict evidence under lock', async () => {
  const current = harness('cleanup');
  current.effects.inspectCleanup = async (input) => {
    current.calls.push(['inspectCleanup', input]);
    return { merged: true, merge_sha: SHA_B, worktree_exists: true, tracked_conflicts: ['tracked.txt'], untracked_conflicts: [] };
  };
  const result = await runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'cleanup-block-task-6' });

  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'append']);
  assert.equal(result.receipt.event, 'cleanup.blocked');
  assert.deepEqual(result.receipt.payload.tracked_conflicts, ['tracked.txt']);
});

test('cleanup verifies merge then removes only the bound worktree and branches before appending', async () => {
  const current = harness('cleanup');
  const result = await runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'cleanup-task-6' });

  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'cleanup', 'append']);
  assert.equal(result.receipt.event, 'cleanup.completed');
  assert.equal(result.receipt.payload.worktree, '.worktrees/issue-101-test');
  const inspectInput = current.calls.find(([name]) => name === 'inspectCleanup')[1];
  const cleanupInput = current.calls.find(([name]) => name === 'cleanup')[1];
  assert.equal(inspectInput.head_sha, SHA_A);
  assert.equal(cleanupInput.expected_remote_sha, SHA_A);
});

test('cleanup rejects a collaborator-advanced remote branch before destructive cleanup', async () => {
  const current = harness('cleanup');
  current.effects.inspectCleanup = async (input) => {
    current.calls.push(['inspectCleanup', input]);
    return { merged: true, merge_sha: SHA_B, worktree_exists: true, local_branch_exists: true, remote_branch_exists: true, remote_branch_sha: SHA_C, tracked_conflicts: [], untracked_conflicts: [] };
  };

  await assert.rejects(
    runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects }),
    assertCode('ERR_STALE_HEAD'),
  );
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup']);
});

test('cleanup surfaces a remote advancement at lease deletion without appending success', async () => {
  const current = harness('cleanup');
  current.effects.cleanup = async (input) => {
    current.calls.push(['cleanup', input]);
    assert.equal(input.expected_remote_sha, SHA_A);
    throw new LaneLedgerError('ERR_STALE_HEAD', 'remote branch changed before lease deletion');
  };

  await assert.rejects(
    runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects }),
    assertCode('ERR_STALE_HEAD'),
  );
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'cleanup']);
});

test('cleanup recheck can block a newly dirty worktree before destructive mutation', async () => {
  const current = harness('cleanup');
  let mutations = 0;
  current.effects.cleanup = async (input) => {
    current.calls.push(['cleanup', input]);
    return { blocked: true, tracked_conflicts: [], untracked_conflicts: ['late.txt'] };
  };
  const result = await runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'cleanup-race-task-6' });
  assert.equal(mutations, 0);
  assert.equal(result.receipt.event, 'cleanup.blocked');
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'cleanup', 'append']);
});

test('cleanup stays pending without proving all bound artifacts absent', async () => {
  for (const effect of [
    { complete: false, worktree_removed: true, local_branch_deleted: false, remote_branch_deleted: false, remote_branch_sha: null },
    { complete: true, worktree_removed: false, local_branch_deleted: false, remote_branch_deleted: false, remote_branch_sha: null },
    { complete: true, worktree_removed: true, local_branch_deleted: true, remote_branch_deleted: true, remote_branch_sha: SHA_A },
  ]) {
    const current = harness('cleanup');
    current.effects.cleanup = async (input) => {
      current.calls.push(['cleanup', input]);
      return effect;
    };
    await assert.rejects(
      runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'cleanup-retained-task-6' }),
      assertCode('ERR_SIDE_EFFECT_PRECONDITION'),
    );
    assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'cleanup']);
  }
});

test('production cleanup deletes a squash-merged branch only at the reviewed head', async (context) => {
  const repository = await disposableRepository(context);
  const projection = projectionFor('cleanup');
  projection.items['issue-101'].head_sha = repository.headSha;
  projection.items['issue-101'].merge_sha = repository.mergeSha;
  const current = harness('cleanup', undefined, projection);
  const system = createSystemEffects(repository.workspace);
  const canonicalWorktree = await realpath(repository.worktree);
  current.effects.inspectCleanup = async () => ({
    merged: true,
    merge_sha: repository.mergeSha,
    worktree_exists: true,
    worktree_realpath: canonicalWorktree,
    local_branch_exists: true,
    remote_branch_exists: true,
    remote_branch_sha: repository.headSha,
    tracked_conflicts: [],
    untracked_conflicts: [],
  });
  current.effects.cleanup = system.cleanup;

  const result = await runWorkflowSideEffect(requestFor('cleanup'), {
    ledger: current.ledger,
    effects: current.effects,
    receiptId: () => 'cleanup-real-squash',
    now: () => '2026-08-18T10:00:00.000Z',
  });

  assert.equal(result.receipt.event, 'cleanup.completed');
  assert.equal(gitExit(repository.workspace, ['show-ref', '--verify', '--quiet', 'refs/heads/issue-101-test']), 1);
  assert.equal(git(repository.workspace, ['ls-remote', '--heads', 'origin', 'refs/heads/issue-101-test']), '');
});

test('production cleanup rejects a replacement worktree branch before removing it', async (context) => {
  const repository = await disposableRepository(context);
  const projection = projectionFor('cleanup');
  projection.items['issue-101'].head_sha = repository.headSha;
  projection.items['issue-101'].merge_sha = repository.mergeSha;
  const current = harness('cleanup', undefined, projection);
  const system = createSystemEffects(repository.workspace);
  const canonicalWorktree = await realpath(repository.worktree);
  current.effects.inspectCleanup = async () => {
    git(repository.workspace, ['branch', 'replacement', repository.mergeSha]);
    git(repository.worktree, ['switch', 'replacement']);
    return {
      merged: true,
      merge_sha: repository.mergeSha,
      worktree_exists: true,
      worktree_realpath: canonicalWorktree,
      local_branch_exists: true,
      remote_branch_exists: true,
      remote_branch_sha: repository.headSha,
      tracked_conflicts: [],
      untracked_conflicts: [],
    };
  };
  current.effects.cleanup = system.cleanup;

  await assert.rejects(
    runWorkflowSideEffect(requestFor('cleanup'), { ledger: current.ledger, effects: current.effects }),
    assertCode('ERR_SIDE_EFFECT_PRECONDITION'),
  );
  assert.equal(git(repository.worktree, ['branch', '--show-current']), 'replacement');
  assert.equal(git(repository.workspace, ['rev-parse', 'refs/heads/issue-101-test']), repository.headSha);
});

test('cleanup preserves inspected dirty evidence when the file is externally restored', async (context) => {
  const repository = await disposableRepository(context);
  const projection = projectionFor('cleanup');
  projection.items['issue-101'].head_sha = repository.headSha;
  projection.items['issue-101'].merge_sha = repository.mergeSha;
  const current = harness('cleanup', undefined, projection);
  const system = createSystemEffects(repository.workspace);
  await writeFile(join(repository.worktree, 'feature.txt'), 'externally dirty\n');
  current.effects.inspectCleanup = async () => {
    git(repository.worktree, ['restore', 'feature.txt']);
    return {
      merged: true,
      merge_sha: repository.mergeSha,
      worktree_exists: true,
      local_branch_exists: true,
      remote_branch_exists: true,
      remote_branch_sha: repository.headSha,
      tracked_conflicts: ['feature.txt'],
      untracked_conflicts: [],
    };
  };
  current.effects.cleanup = system.cleanup;

  const result = await runWorkflowSideEffect(requestFor('cleanup'), {
    ledger: current.ledger,
    effects: current.effects,
    receiptId: () => 'cleanup-dirty-baseline',
    now: () => '2026-08-18T10:00:00.000Z',
  });

  assert.equal(result.receipt.event, 'cleanup.blocked');
  assert.deepEqual(result.receipt.payload.tracked_conflicts, ['feature.txt']);
  assert.equal(git(repository.worktree, ['branch', '--show-current']), 'issue-101-test');
});

test('revision and cleanup-state denials have zero external calls', async () => {
  const stale = harness('merge');
  await assert.rejects(runWorkflowSideEffect(requestFor('merge', { expected_revision: 8 }), stale), assertCode('ERR_REVISION_CONFLICT'));
  assert.deepEqual(stale.calls, []);

  const beforeMerge = harness('cleanup');
  beforeMerge.ledger = {
    async withLockedLane(laneId, callback) {
      const projection = projectionFor('cleanup');
      projection.items['issue-101'].state = 'merged';
      return callback({ projection, append() { throw new Error('must not append'); } });
    },
  };
  await assert.rejects(runWorkflowSideEffect(requestFor('cleanup'), beforeMerge), assertCode('ERR_SIDE_EFFECT_PRECONDITION'));
  assert.deepEqual(beforeMerge.calls, []);
});

test('root sync rejects dirty or non-fast-forward roots without mutation and records a blocked outcome', async () => {
  for (const live of [
    { dirty: true, head_sha: SHA_B, remote_head_sha: SHA_C, fast_forward: true },
    { dirty: false, head_sha: SHA_B, remote_head_sha: SHA_C, fast_forward: false },
  ]) {
    const current = harness('root-sync');
    current.effects.inspectRootSync = async (input) => { current.calls.push(['inspectRootSync', input]); return live; };
    const result = await runWorkflowSideEffect(requestFor('root-sync'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'root-block-task-6' });
    assert.deepEqual(current.calls.map(([name]) => name), ['inspectRootSync', 'append']);
    assert.equal(result.receipt.event, 'root_sync.blocked');
    assert.equal(result.receipt.payload.reason, live.dirty ? 'dirty-root' : 'non-ff');
  }
});

test('root sync fast-forwards the bound base and appends completion before lock release', async () => {
  const current = harness('root-sync');
  const result = await runWorkflowSideEffect(requestFor('root-sync'), { ledger: current.ledger, effects: current.effects, now: () => '2026-08-18T10:00:00.000Z', receiptId: () => 'root-task-6' });

  assert.deepEqual(current.calls.map(([name]) => name), ['inspectRootSync', 'rootSync', 'append']);
  assert.equal(result.receipt.event, 'root_sync.completed');
  assert.equal(result.receipt.payload.head_sha, SHA_C);
  const rootInput = current.calls.find(([name]) => name === 'rootSync')[1];
  assert.equal(rootInput.expected_local_sha, SHA_B);
  assert.equal(rootInput.expected_head_sha, SHA_C);
});

test('production root sync records a wrong checked-out branch as a canonical blocked receipt', async (context) => {
  const repository = await disposableRepository(context);
  await advanceRemote(repository, 'remote-ahead');
  git(repository.workspace, ['switch', '-c', 'wrong-branch']);
  const current = harness('root-sync');
  const system = createSystemEffects(repository.workspace);

  const result = await runWorkflowSideEffect(requestFor('root-sync'), {
    ledger: current.ledger,
    effects: system,
    now: () => '2026-08-18T10:00:00.000Z',
    receiptId: () => 'root-wrong-branch',
  });

  assert.equal(result.receipt.event, 'root_sync.blocked');
  assert.equal(result.receipt.payload.reason, 'external-identity-mismatch');
  assert.deepEqual(Object.keys(result.receipt.payload.evidence).sort(), ['artifact_basename', 'evidence_sha256', 'receipt_id']);
  assert.equal(git(repository.workspace, ['branch', '--show-current']), 'wrong-branch');
  assert.deepEqual(current.calls.map(([name]) => name), ['append']);
});

test('production root sync fast-forwards only the inspected base identity', async (context) => {
  const repository = await disposableRepository(context);
  const expectedHead = await advanceRemote(repository, 'remote-success');
  git(repository.workspace, ['fetch', 'origin', 'refs/heads/main']);
  const current = harness('root-sync');
  const system = createSystemEffects(repository.workspace);
  const inspection = await system.inspectRootSync({ repository: REPOSITORY, base_branch: 'main' });
  assert.deepEqual({ dirty: inspection.dirty, fast_forward: inspection.fast_forward }, { dirty: false, fast_forward: true });

  const result = await runWorkflowSideEffect(requestFor('root-sync'), {
    ledger: current.ledger,
    effects: system,
    receiptId: () => 'root-sync-real-success',
    now: () => '2026-08-18T10:00:00.000Z',
  });

  assert.equal(result.receipt.event, 'root_sync.completed');
  assert.equal(result.receipt.payload.head_sha, expectedHead);
  assert.equal(git(repository.workspace, ['branch', '--show-current']), 'main');
  assert.equal(git(repository.workspace, ['rev-parse', 'HEAD']), expectedHead);
});

test('production root sync rejects a local HEAD race after inspection', async (context) => {
  const repository = await disposableRepository(context);
  await advanceRemote(repository, 'remote-race');
  git(repository.workspace, ['fetch', 'origin', 'refs/heads/main']);
  const system = createSystemEffects(repository.workspace);
  const live = await system.inspectRootSync({ repository: REPOSITORY, base_branch: 'main' });
  assert.notEqual(live.head_sha, live.remote_head_sha, 'fixture must require a root fast-forward');
  git(repository.workspace, ['reset', '--hard', 'HEAD^']);

  await assert.rejects(
    system.rootSync({ repository: REPOSITORY, base_branch: 'main', expected_local_sha: live.head_sha, expected_head_sha: live.remote_head_sha }),
    assertCode('ERR_SIDE_EFFECT_PRECONDITION'),
  );
  assert.equal(git(repository.workspace, ['branch', '--show-current']), 'main');
  assert.notEqual(git(repository.workspace, ['rev-parse', 'HEAD']), live.head_sha);
});

test('production root sync records a canonical remote for another repository as blocked', async (context) => {
  const repository = await disposableRepository(context);
  git(repository.workspace, ['remote', 'set-url', 'origin', 'git@github.com:other/repository.git']);
  const current = harness('root-sync');
  const system = createSystemEffects(repository.workspace);

  const result = await runWorkflowSideEffect(requestFor('root-sync'), {
    ledger: current.ledger,
    effects: system,
    now: () => '2026-08-18T10:00:00.000Z',
    receiptId: () => 'root-wrong-repository',
  });

  assert.equal(result.receipt.event, 'root_sync.blocked');
  assert.equal(result.receipt.payload.reason, 'external-identity-mismatch');
  assert.deepEqual(Object.keys(result.receipt.payload.evidence).sort(), ['artifact_basename', 'evidence_sha256', 'receipt_id']);
  assert.deepEqual(current.calls.map(([name]) => name), ['append']);
});

test('root sync does not convert unrelated inspection failures into identity conflicts', async () => {
  const current = harness('root-sync');
  const processFailure = new Error('git inspection failed');
  current.effects.inspectRootSync = async () => { throw processFailure; };

  await assert.rejects(runWorkflowSideEffect(requestFor('root-sync'), { ledger: current.ledger, effects: current.effects }), (error) => error === processFailure);
  assert.deepEqual(current.calls, []);
});

test('root sync records external repository or branch identity conflicts without mutation', async () => {
  for (const conflict of ['repository', 'branch']) {
    const current = harness('root-sync');
    current.effects.inspectRootSync = async (input) => {
      current.calls.push(['inspectRootSync', input]);
      return { identity_conflict: conflict, dirty: false, head_sha: SHA_B, remote_head_sha: SHA_C, fast_forward: true };
    };
    const result = await runWorkflowSideEffect(requestFor('root-sync'), {
      ledger: current.ledger,
      effects: current.effects,
      now: () => '2026-08-18T10:00:00.000Z',
      receiptId: () => `root-identity-${conflict}`,
    });
    assert.equal(result.receipt.event, 'root_sync.blocked');
    assert.equal(result.receipt.payload.reason, 'external-identity-mismatch');
    assert.deepEqual(current.calls.map(([name]) => name), ['inspectRootSync', 'append']);
  }
});

test('production CLI source exposes no adapter or module-path injection flags', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../../scripts/workflow/workflow-side-effect.mjs', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /--(?:adapter|module|root|cwd|effects)/u);
  assert.match(source, /\['merge', 'cleanup', 'root-sync'\]/u);
  assert.match(source, /--match-head-commit/u);
  assert.match(source, /beforeFetch\.remote_head_sha !== expectedHeadSha/u);
  assert.match(source, /fetched !== expectedHeadSha/u);
  assert.doesNotMatch(source, /\['pull', '--ff-only'/u);
  assert.match(source, /\['worktree', 'remove', identity\.path\]/u);
  assert.doesNotMatch(source, /\['worktree', 'remove', identity\.path, '--force'\]/u);
  assert.match(source, /\['update-ref', '-d', ref, expectedLocalSha\]/u);
  assert.doesNotMatch(source, /\['branch', '-d'/u);
  assert.doesNotMatch(source, /\['branch', '-D'/u);
  assert.match(source, /--force-with-lease=/u);
  assert.doesNotMatch(source, /\['push', 'origin', '--delete'/u);
});
