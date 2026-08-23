import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  LaneLedgerError,
  authorizeTestStoredLane,
  createReceipt,
  createStoredLane,
  openTestLedgerStore,
  replayReceipts,
  transitionStoredLane,
  validateStoredLane,
  withTestLockedStoredLaneSideEffectTransaction,
} from '../../scripts/workflow/lane-ledger.mjs';
import { planExecuteLaneStep } from '../../scripts/workflow/execute-lane-reconcile.mjs';
import { runWorkflowSideEffect } from '../../scripts/workflow/workflow-side-effect.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const CHECKS = [{ name: 'ci', run_id: 7001, status: 'PASS', head_sha: SHA_A }];

function sideEffectHarness(state) {
  const calls = [];
  const projection = {
    version: 1,
    lane_id: 'lane-task-7-restart',
    revision: state === 'merge-ready' ? 9 : 11,
    repository: 'ilokesto/ilokesto',
    base_branch: 'main',
    workflow_state: 'running',
    root_sync: 'pending',
    authority: {
      repository: 'ilokesto/ilokesto', lane_id: 'lane-task-7-restart', issues: [101],
      operations: [state === 'merge-ready' ? 'merge' : 'cleanup'], consumed_operations: [], receipt_id: 'authority-task-7',
    },
    items: {
      'issue-101': {
        state, attempt: 1, dispatch_id: 'dispatch-101', issue_number: 101,
        issue_url: 'https://github.com/ilokesto/ilokesto/issues/101', branch: 'issue-101-test',
        worktree: '.worktrees/issue-101-test', pr_number: 501, head_sha: SHA_A,
        merge_sha: state === 'cleanup-pending' ? SHA_B : undefined,
        review: { receipt_id: 'review-task-7', checks: CHECKS, outcome: 'merge' },
      },
    },
  };
  return {
    calls,
    projection,
    ledger: {
      async withLockedLane(laneId, callback) {
        assert.equal(laneId, projection.lane_id);
        return callback({
          projection,
          append(receipt) {
            calls.push(['append', receipt]);
            return { projection, receipt };
          },
        });
      },
    },
  };
}

function request(operation, revision) {
  return {
    operation,
    lane_id: 'lane-task-7-restart',
    item_id: 'issue-101',
    expected_revision: revision,
    authority_receipt_id: 'authority-task-7',
  };
}

function assertCode(code) {
  return (error) => error instanceof LaneLedgerError && error.code === code;
}

function globalReceipt(event, projection, payload = {}) {
  return createReceipt({
    version: 1, receipt_id: `task-7-${String(projection.revision + 1)}-${event.replaceAll('.', '-')}`,
    event, lane_id: projection.lane_id, item_id: null, attempt: 0, dispatch_id: null,
    producer: event === 'workflow.started' || event === 'workflow.completed' ? 'supervisor' : 'dedicated native-approval-gated authorize operation',
    expected_revision: projection.revision, repository: projection.repository, base_branch: projection.base_branch,
    created_at: `2026-08-18T11:00:${String(projection.revision).padStart(2, '0')}.000Z`, payload,
  });
}

function createdReceipt(itemCount = 2) {
  const items = Array.from({ length: itemCount }, (_, index) => {
    const issueNumber = 101 + index;
    return {
      item_id: `issue-${String(issueNumber)}`, issue_number: issueNumber,
      issue_url: `https://github.com/ilokesto/ilokesto/issues/${String(issueNumber)}`,
      hard_dependencies: [], ordering_dependencies: [],
    };
  });
  return createReceipt({
    version: 1, receipt_id: 'task-7-lane-created', event: 'lane.created', lane_id: 'lane-task-7-temp',
    item_id: null, attempt: 0, dispatch_id: null, producer: 'supervisor create operation', expected_revision: 0,
    repository: 'ilokesto/ilokesto', base_branch: 'main', created_at: '2026-08-18T11:00:00.000Z',
    payload: { source_selection_handoff_id: 'source-task-7', items },
  });
}

function plannerFacts(itemIds) {
  return {
    root: { tracked: [], untracked: [], head_sha: SHA_A },
    items: Object.fromEntries(itemIds.map((itemId) => [itemId, {
      base: { head_sha: SHA_A, contains_merge_shas: true },
      remote_branch: { exists: false, head_sha: null },
      worktree: { exists: false, branch: null, tracked: [], untracked: [] },
      pr: null,
      review_result: null,
    }])),
  };
}

function dispatchReceipt(projection, planned, dispatchId) {
  const current = projection.items[planned.item_id];
  return createReceipt({
    version: 1, receipt_id: `task-7-${dispatchId}`, event: 'item.dispatched', lane_id: projection.lane_id,
    item_id: planned.item_id, attempt: current.attempt, dispatch_id: dispatchId, producer: 'supervisor',
    expected_revision: planned.expected_revision, repository: projection.repository, base_branch: projection.base_branch,
    created_at: '2026-08-18T11:01:00.000Z',
    payload: { base_sha: planned.base_sha, required_merge_shas: planned.required_merge_shas, base_contains_merge_shas: true },
  });
}

function blockedReceipt(projection, planned, receiptId) {
  const current = projection.items[planned.item_id];
  return createReceipt({
    version: 1, receipt_id: receiptId, event: 'item.blocked', lane_id: projection.lane_id,
    item_id: planned.item_id, attempt: current.attempt, dispatch_id: current.dispatch_id, producer: 'supervisor/guarded wrapper',
    expected_revision: planned.expected_revision, repository: projection.repository, base_branch: projection.base_branch,
    created_at: '2026-08-18T11:01:00.000Z',
    payload: { error_state: planned.error_state, error_code: planned.error_code, evidence: [{ receipt_id: `${receiptId}-evidence`, evidence_sha256: 'c'.repeat(64), artifact_basename: 'task-7-workflow-ledger-handover.txt' }] },
  });
}

test('merge-before-receipt restart appends the discovered exact merge without merging twice', async () => {
  // Given
  const current = sideEffectHarness('merge-ready');
  const effects = {
    async inspectMerge(input) {
      current.calls.push(['inspectMerge', input]);
      return { head_sha: SHA_A, checks: CHECKS, merged: true, merge_sha: SHA_B };
    },
    async merge() {
      throw new Error('merge must not repeat');
    },
  };

  // When
  const result = await runWorkflowSideEffect(request('merge', 9), {
    ledger: current.ledger,
    effects,
    now: () => '2026-08-18T11:00:00.000Z',
    receiptId: () => 'merge-reconciled-task-7',
  });

  // Then
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectMerge', 'append']);
  assert.equal(result.receipt.event, 'merge.completed');
  assert.equal(result.receipt.payload.merge_sha, SHA_B);
});

test('merge-before-receipt restart refuses a missing or malformed discovered merge identity', async () => {
  // Given
  const current = sideEffectHarness('merge-ready');
  const effects = {
    async inspectMerge() { return { head_sha: SHA_A, checks: CHECKS, merged: true, merge_sha: null }; },
    async merge() { throw new Error('merge must not repeat'); },
  };

  // When / Then
  await assert.rejects(runWorkflowSideEffect(request('merge', 9), { ledger: current.ledger, effects }), assertCode('ERR_SIDE_EFFECT_PRECONDITION'));
  assert.deepEqual(current.calls, []);
});

test('cleanup-before-receipt restart records already-removed only when all exact artifacts are absent', async () => {
  // Given
  const current = sideEffectHarness('cleanup-pending');
  const effects = {
    async inspectCleanup(input) {
      current.calls.push(['inspectCleanup', input]);
      return {
        merged: true, merge_sha: SHA_B, worktree_exists: false, local_branch_exists: false,
        remote_branch_exists: false, remote_branch_sha: null, tracked_conflicts: [], untracked_conflicts: [],
      };
    },
    async cleanup() { throw new Error('cleanup must not repeat'); },
  };

  // When
  const result = await runWorkflowSideEffect(request('cleanup', 11), {
    ledger: current.ledger,
    effects,
    now: () => '2026-08-18T11:00:00.000Z',
    receiptId: () => 'cleanup-reconciled-task-7',
  });

  // Then
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'append']);
  assert.equal(result.receipt.event, 'cleanup.skipped');
  assert.equal(result.receipt.payload.reason, 'already-removed');
});

test('dirty cleanup reconciliation appends a terminal conflict without deleting anything', async () => {
  // Given
  const current = sideEffectHarness('cleanup-pending');
  const effects = {
    async inspectCleanup(input) {
      current.calls.push(['inspectCleanup', input]);
      return {
        merged: true, merge_sha: SHA_B, worktree_exists: true, local_branch_exists: true,
        remote_branch_exists: true, tracked_conflicts: ['tracked.txt'], untracked_conflicts: ['new.txt'],
      };
    },
    async cleanup() { throw new Error('dirty cleanup must not mutate'); },
  };

  // When
  const result = await runWorkflowSideEffect(request('cleanup', 11), {
    ledger: current.ledger, effects, now: () => '2026-08-18T11:00:00.000Z', receiptId: () => 'cleanup-dirty-task-7',
  });

  // Then
  assert.deepEqual(current.calls.map(([name]) => name), ['inspectCleanup', 'append']);
  assert.equal(result.receipt.event, 'cleanup.blocked');
  assert.deepEqual(result.receipt.payload.tracked_conflicts, ['tracked.txt']);
  assert.deepEqual(result.receipt.payload.untracked_conflicts, ['new.txt']);
});

test('temporary ledger drain replans after a CAS loser and advances the other item independently', async (context) => {
  // Given
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-7-cas-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  const created = createStoredLane(store, createdReceipt());
  transitionStoredLane(store, globalReceipt('workflow.started', created.projection));
  const initial = validateStoredLane(store, 'lane-task-7-temp');
  const planned = planExecuteLaneStep({ projection: initial.projection, receipts: initial.receipts, facts: plannerFacts(Object.keys(initial.projection.items)) });
  const first = dispatchReceipt(initial.projection, planned[0], 'dispatch-101');
  const staleSecond = dispatchReceipt(initial.projection, planned[1], 'dispatch-102-stale');

  // When
  transitionStoredLane(store, first);
  assert.throws(() => transitionStoredLane(store, staleSecond), assertCode('ERR_REVISION_CONFLICT'));
  const replayed = validateStoredLane(store, 'lane-task-7-temp');
  const replanned = planExecuteLaneStep({ projection: replayed.projection, receipts: replayed.receipts, facts: plannerFacts(Object.keys(replayed.projection.items)) });
  transitionStoredLane(store, dispatchReceipt(replayed.projection, replanned.find(({ item_id: itemId }) => itemId === 'issue-102'), 'dispatch-102'));

  // Then
  const final = validateStoredLane(store, 'lane-task-7-temp');
  assert.equal(final.projection.items['issue-101'].state, 'dispatching');
  assert.equal(final.projection.items['issue-102'].state, 'dispatching');
  assert.deepEqual(final.projection, replayReceipts(final.receipts));
  store.close();
});

test('failed hard dependencies propagate transitively across replay cycles before workflow terminalization', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-7-dependency-failure-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  const laneCreated = structuredClone(createdReceipt(3));
  laneCreated.payload.items[1].hard_dependencies = ['issue-101'];
  laneCreated.payload.items[2].hard_dependencies = ['issue-102'];
  let ledger = createStoredLane(store, laneCreated);
  ledger = transitionStoredLane(store, globalReceipt('workflow.started', ledger.projection));
  ledger = transitionStoredLane(store, createReceipt({
    version: 1, receipt_id: 'task-7-prerequisite-failed', event: 'item.blocked', lane_id: ledger.lane_id,
    item_id: 'issue-101', attempt: 0, dispatch_id: null, producer: 'supervisor/guarded wrapper', expected_revision: ledger.revision,
    repository: ledger.repository, base_branch: ledger.projection.base_branch, created_at: '2026-08-18T11:01:00.000Z',
    payload: { error_state: 'blocked-retry-exhausted', error_code: 'ERR_SIDE_EFFECT_PRECONDITION', evidence: [{ receipt_id: 'task-7-prerequisite-evidence', evidence_sha256: 'b'.repeat(64), artifact_basename: 'task-7-workflow-ledger-handover.txt' }] },
  }));
  const facts = plannerFacts(Object.keys(ledger.projection.items));

  let planned = planExecuteLaneStep({ projection: ledger.projection, receipts: ledger.receipts, facts });
  assert.deepEqual(planned.map(({ item_id: itemId, event, reason }) => ({ item_id: itemId, event, reason })), [
    { item_id: 'issue-102', event: 'item.blocked', reason: 'hard-dependency-terminal-before-merge:issue-101' },
    { item_id: 'issue-103', event: undefined, reason: 'hard-dependency-merge' },
  ]);
  ledger = transitionStoredLane(store, blockedReceipt(ledger.projection, planned[0], 'task-7-dependent-failed'));

  planned = planExecuteLaneStep({ projection: ledger.projection, receipts: ledger.receipts, facts });
  assert.equal(planned[0].item_id, 'issue-103');
  assert.equal(planned[0].reason, 'hard-dependency-terminal-before-merge:issue-102');
  ledger = transitionStoredLane(store, blockedReceipt(ledger.projection, planned[0], 'task-7-transitive-dependent-failed'));

  planned = planExecuteLaneStep({ projection: ledger.projection, receipts: ledger.receipts, facts });
  assert.deepEqual(planned, [{
    action: 'append', event: 'workflow.blocked', item_id: null, expected_revision: ledger.revision,
    terminal_items: [
      { item_id: 'issue-101', error_state: 'blocked-retry-exhausted' },
      { item_id: 'issue-102', error_state: 'blocked-child-contract-error' },
      { item_id: 'issue-103', error_state: 'blocked-child-contract-error' },
    ],
  }]);
  const terminalItems = planned[0].terminal_items;
  ledger = transitionStoredLane(store, createReceipt({
    version: 1, receipt_id: 'task-7-workflow-blocked', event: 'workflow.blocked', lane_id: ledger.lane_id,
    item_id: null, attempt: 0, dispatch_id: null, producer: 'supervisor', expected_revision: ledger.revision,
    repository: ledger.repository, base_branch: ledger.projection.base_branch, created_at: '2026-08-18T11:02:00.000Z',
    payload: { terminal_item_ids: terminalItems.map(({ item_id: itemId }) => itemId), no_runnable_recovery: true, recovery_evidence: terminalItems.map(({ item_id: itemId, error_state: errorState }) => ({ item_id: itemId, error_state: errorState, reason: 'hard dependency chain cannot recover' })) },
  }));

  assert.equal(ledger.projection.workflow_state, 'blocked-terminal');
  assert.deepEqual(ledger.projection, replayReceipts(ledger.receipts));
  store.close();
});

test('terminal temporary-ledger replay equals persisted projection after wrapper-only root reconciliation', async (context) => {
  // Given
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-7-terminal-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  let ledger = createStoredLane(store, createdReceipt(1));
  ledger = transitionStoredLane(store, globalReceipt('workflow.started', ledger.projection));
  const item = ledger.projection.items['issue-101'];
  ledger = transitionStoredLane(store, createReceipt({
    version: 1, receipt_id: 'task-7-release-handoff', event: 'release_handoff.created', lane_id: ledger.projection.lane_id,
    item_id: 'issue-101', attempt: item.attempt, dispatch_id: item.dispatch_id, producer: 'supervisor',
    expected_revision: ledger.revision, repository: ledger.repository, base_branch: ledger.projection.base_branch,
    created_at: '2026-08-18T11:02:00.000Z',
    payload: { merged_shas: [SHA_A], package: 'store', changeset: 'not-required', target_dist_tag: 'latest', required_external_step: 'github-actions-release' },
  }));
  ledger = authorizeTestStoredLane(store, globalReceipt('authority.granted', ledger.projection, {
    repository: ledger.repository, lane_id: ledger.lane_id, issues: [], operations: ['root-sync'],
    squash_method: 'squash', approved_at: '2026-08-18T11:00:03.000Z',
  }));
  const ledgerAdapter = { withLockedLane: (laneId, callback) => withTestLockedStoredLaneSideEffectTransaction(store, laneId, callback) };

  // When
  await runWorkflowSideEffect({ operation: 'root-sync', lane_id: ledger.lane_id, expected_revision: ledger.revision, authority_receipt_id: ledger.projection.authority.receipt_id }, {
    ledger: ledgerAdapter,
    effects: { async inspectRootSync() { return { dirty: false, head_sha: SHA_A, remote_head_sha: SHA_A, fast_forward: true }; }, async rootSync() { throw new Error('root sync must not repeat'); } },
    now: () => '2026-08-18T11:03:00.000Z', receiptId: () => 'task-7-root-skip',
  });
  ledger = validateStoredLane(store, ledger.lane_id);
  transitionStoredLane(store, globalReceipt('workflow.completed', ledger.projection, { root_sync_receipt_id: ledger.projection.root_sync_receipt_id }));

  // Then
  const terminal = validateStoredLane(store, ledger.lane_id);
  assert.equal(terminal.projection.workflow_state, 'done');
  assert.deepEqual(terminal.projection, replayReceipts(terminal.receipts));
  store.close();
});
