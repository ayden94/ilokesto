import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  LaneLedgerError,
  createReceipt,
  createStoredLane,
  openTestLedgerStore,
  validateReceipt,
  validateStoredLane,
  withLockedStoredLaneTransaction,
  withTestLockedStoredLaneSideEffectTransaction,
} from '../../scripts/workflow/lane-ledger.mjs';
import { runWorkflowSideEffect } from '../../scripts/workflow/workflow-side-effect.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const supervisor = 'ilokesto-workflow-supervisor';

function cleanupHarness(live, cleanupResult) {
  const calls = [];
  const projection = {
    version: 1,
    lane_id: 'lane-task-6-closure',
    revision: 11,
    repository: 'ilokesto/ilokesto',
    base_branch: 'main',
    workflow_state: 'running',
    root_sync: 'pending',
    authority: {
      repository: 'ilokesto/ilokesto',
      lane_id: 'lane-task-6-closure',
      issues: [101],
      operations: ['cleanup'],
      consumed_operations: [],
      receipt_id: 'authority-task-6-closure',
    },
    items: {
      'issue-101': {
        state: 'cleanup-pending',
        attempt: 1,
        dispatch_id: 'dispatch-101',
        issue_number: 101,
        branch: 'issue-101-test',
        worktree: '.worktrees/issue-101-test',
        pr_number: 101,
        head_sha: SHA_A,
        merge_sha: SHA_B,
      },
    },
  };
  const ledger = {
    async withLockedLane(laneId, callback) {
      assert.equal(laneId, projection.lane_id);
      return callback({
        projection,
        append(receipt) {
          validateReceipt(receipt);
          calls.push(['append', receipt]);
          return { projection, receipt };
        },
      });
    },
  };
  const effects = {
    async inspectCleanup(input) { calls.push(['inspectCleanup', input]); return live; },
    async cleanup(input) {
      calls.push(['cleanup', input]);
      assert.equal(input.branch, 'issue-101-test');
      assert.equal(input.worktree, '.worktrees/issue-101-test');
      return cleanupResult;
    },
  };
  return { calls, ledger, effects };
}

function cleanupRequest() {
  return {
    operation: 'cleanup',
    lane_id: 'lane-task-6-closure',
    item_id: 'issue-101',
    expected_revision: 11,
    authority_receipt_id: 'authority-task-6-closure',
  };
}

function dependencies(current, receiptId) {
  return {
    ledger: current.ledger,
    effects: current.effects,
    now: () => '2026-08-18T10:30:00.000Z',
    receiptId: () => receiptId,
  };
}

test('all five workflow commands resolve to the workflow supervisor', async () => {
  for (const command of ['search-issue', 'create-lane', 'execute-lane', 'issue-to-pr', 'pr-to-merge']) {
    const content = await readFile(new URL(`../../.opencode/commands/${command}.md`, import.meta.url), 'utf8');
    const header = content.match(/^---\n([\s\S]*?)\n---\n/u)?.[1];
    assert.ok(header, `${command} frontmatter is required`);
    assert.match(header, new RegExp(`^agent: ${supervisor}$`, 'mu'), `${command} must resolve to ${supervisor}`);
  }
});

test('side-effect wrapper contains no lane lock read replay or persistence implementation', async () => {
  const source = await readFile(new URL('../../scripts/workflow/workflow-side-effect.mjs', import.meta.url), 'utf8');
  for (const forbidden of [
    'openRuntimeLedgerStore', 'parseLedger', 'replayReceipts', 'validateLegalTransition',
    'openSync', 'readFileSync', 'writeFileSync', 'fsyncSync', 'renameSync', 'mkdirSync',
    'locksFd', '.locks',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.match(source, /executeRuntimeWorkflowSideEffect/u);
  const ledgerSource = await readFile(new URL('../../scripts/workflow/lane-ledger.mjs', import.meta.url), 'utf8');
  assert.match(ledgerSource, /export function withLockedStoredLaneTransaction/u);
  assert.match(ledgerSource, /export function withRuntimeLockedStoredLaneTransaction/u);
  assert.doesNotMatch(ledgerSource, /export function withLockedStoredLaneSideEffectTransaction/u);
  assert.doesNotMatch(ledgerSource, /export function withRuntimeLockedStoredLaneSideEffectTransaction/u);
  assert.match(ledgerSource, /transitionStoredLane[\s\S]*withLockedStoredLaneTransaction/u);
  assert.doesNotMatch(ledgerSource, /export function authorizeStoredLane/u);
  assert.match(ledgerSource, /export function authorizeRuntimeStoredLane[\s\S]*authorizeStoredLane/u);
  assert.match(ledgerSource, /export function authorizeTestStoredLane[\s\S]*test authorization requires a test ledger store/u);
});

test('canonical transaction holds one lane lock across async work and validated append', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-6-transaction-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  const created = JSON.parse(await readFile(new URL('./fixtures/lane-ledger/create-receipt.json', import.meta.url), 'utf8'));
  createStoredLane(store, created);
  const lockOwner = join(root, '.omo', 'lanes', '.locks', `${created.lane_id}.lock`);
  const started = createReceipt({
    version: 1,
    receipt_id: 'task-6-workflow-started',
    event: 'workflow.started',
    lane_id: created.lane_id,
    item_id: null,
    attempt: 0,
    dispatch_id: null,
    producer: 'supervisor',
    expected_revision: 1,
    repository: created.repository,
    base_branch: created.base_branch,
    created_at: '2026-08-18T10:30:00.000Z',
    payload: {},
  });

  const result = await withTestLockedStoredLaneSideEffectTransaction(store, created.lane_id, async ({ append }) => {
    await Promise.resolve();
    assert.match(await readFile(lockOwner, 'utf8'), new RegExp(`"lane_id":"${created.lane_id}"`, 'u'));
    return append(started);
  });

  assert.equal(result.ledger.revision, 2);
  assert.equal(validateStoredLane(store, created.lane_id).projection.workflow_state, 'running');
  await assert.rejects(readFile(lockOwner, 'utf8'), (error) => error?.code === 'ENOENT');
  store.close();
});

test('cleanup skips only when worktree and both exact branches are already absent', async () => {
  const current = cleanupHarness({
    merged: true,
    merge_sha: SHA_B,
    worktree_exists: false,
    local_branch_exists: false,
    remote_branch_exists: false,
    remote_branch_sha: null,
    tracked_conflicts: [],
    untracked_conflicts: [],
  }, null);
  const result = await runWorkflowSideEffect(cleanupRequest(), dependencies(current, 'cleanup-absent-task-6'));
  assert.equal(result.receipt.event, 'cleanup.skipped');
  assert.equal(result.receipt.payload.reason, 'already-removed');
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'append']);
});

for (const residual of [
  { local_branch_exists: true, remote_branch_exists: false },
  { local_branch_exists: false, remote_branch_exists: true },
  { local_branch_exists: true, remote_branch_exists: true },
]) {
  test(`cleanup removes exact residual branches when local=${String(residual.local_branch_exists)} remote=${String(residual.remote_branch_exists)}`, async () => {
    const current = cleanupHarness({
      merged: true,
      merge_sha: SHA_B,
      worktree_exists: false,
      ...residual,
      remote_branch_sha: residual.remote_branch_exists ? SHA_A : null,
      tracked_conflicts: [],
      untracked_conflicts: [],
    }, {
      complete: true,
      worktree_removed: true,
      local_branch_deleted: true,
      remote_branch_deleted: true,
      remote_branch_sha: null,
    });
    const result = await runWorkflowSideEffect(cleanupRequest(), dependencies(current, `cleanup-residual-${String(Number(residual.local_branch_exists))}${String(Number(residual.remote_branch_exists))}`));
    assert.equal(result.receipt.event, 'cleanup.completed');
    assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'cleanup', 'append']);
  });
}

test('cleanup cannot finish while any exact residual artifact remains', async () => {
  const current = cleanupHarness({
    merged: true,
    merge_sha: SHA_B,
    worktree_exists: false,
    local_branch_exists: true,
    remote_branch_exists: false,
    remote_branch_sha: null,
    tracked_conflicts: [],
    untracked_conflicts: [],
  }, {
    complete: false,
    worktree_removed: true,
    local_branch_deleted: false,
    remote_branch_deleted: true,
    remote_branch_sha: null,
  });
  await assert.rejects(
    runWorkflowSideEffect(cleanupRequest(), dependencies(current, 'cleanup-incomplete-task-6')),
    (error) => error instanceof LaneLedgerError && error.code === 'ERR_SIDE_EFFECT_PRECONDITION',
  );
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'cleanup']);
});
