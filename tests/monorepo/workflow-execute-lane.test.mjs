import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { planExecuteLaneStep } from '../../scripts/workflow/execute-lane-reconcile.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);

function item(overrides = {}) {
  return {
    state: 'queued',
    attempt: 0,
    dispatch_id: null,
    issue_number: 101,
    issue_url: 'https://github.com/ilokesto/ilokesto/issues/101',
    hard_dependencies: [],
    ordering_dependencies: [],
    ...overrides,
  };
}

function projection(items, overrides = {}) {
  return {
    lane_id: 'lane-task-7',
    revision: 10,
    repository: 'ilokesto/ilokesto',
    base_branch: 'main',
    workflow_state: 'running',
    root_sync: 'pending',
    authority: null,
    items,
    ...overrides,
  };
}

function facts(overrides = {}) {
  return {
    base: { head_sha: SHA_A, contains_merge_shas: true },
    remote_branch: { exists: false, head_sha: null },
    worktree: { exists: false, branch: null, tracked: [], untracked: [] },
    pr: null,
    review_result: null,
    ...overrides,
  };
}

test('execute-lane exposes one machine-readable single-writer drain contract', async () => {
  // Given
  const command = await readFile(new URL('../../.opencode/commands/execute-lane.md', import.meta.url), 'utf8');

  // When
  const block = command.match(/```workflow-command-contract\n([\s\S]*?)\n```/u);

  // Then
  assert.ok(block, 'execute-lane must expose one workflow-command-contract block');
  assert.deepEqual(JSON.parse(block[1]), {
    version: 1,
    command: 'execute-lane',
    owner: 'supervisor',
    ledger_operations: ['validate', 'project', 'transition'],
    side_effect_operations: ['merge', 'cleanup', 'root-sync'],
    progression: 'per-item-drain',
    revision_guard: 'after-every-boundary',
    conflict_state: 'blocked-ledger-conflict',
    authority_consumption: ['merge:<issue>', 'cleanup:<issue>', 'root-sync'],
  });
});

test('reconciliation planner stays pure and contains no ledger persistence path', async () => {
  // Given
  const source = await readFile(new URL('../../scripts/workflow/execute-lane-reconcile.mjs', import.meta.url), 'utf8');

  // When / Then
  for (const forbidden of ['node:fs', 'openRuntimeLedgerStore', 'openTestLedgerStore', 'transitionStoredLane', 'withLockedStoredLaneTransaction', 'writeFileSync', 'renameSync', 'fsyncSync']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.match(source, /export function planExecuteLaneStep/u);
});

test('planner drains independently runnable items without a global batch barrier', () => {
  // Given
  const current = projection({
    'issue-101': item({ state: 'implementation-complete', attempt: 1, dispatch_id: 'dispatch-101', commit_sha: SHA_A, branch: 'issue-101-a', worktree: '.worktrees/issue-101-a' }),
    'issue-102': item({ issue_number: 102, issue_url: 'https://github.com/ilokesto/ilokesto/issues/102' }),
  });
  const observed = {
    root: { tracked: [], untracked: [], head_sha: SHA_A },
    items: {
      'issue-101': facts({ remote_branch: { exists: true, head_sha: SHA_A } }),
      'issue-102': facts(),
    },
  };

  // When
  const actions = planExecuteLaneStep({ projection: current, receipts: [], facts: observed });

  // Then
  assert.deepEqual(actions, [
    { action: 'external', operation: 'pr-create', item_id: 'issue-101', expected_revision: 10 },
    { action: 'append', event: 'item.dispatched', item_id: 'issue-102', expected_revision: 10, base_sha: SHA_A, required_merge_shas: [] },
  ]);
});

test('planner separates hard merge ancestry from ordering-only terminality', () => {
  // Given
  const current = projection({
    'issue-101': item({ state: 'merged', attempt: 1, dispatch_id: 'dispatch-101', merge_sha: SHA_B }),
    'issue-102': item({ state: 'blocked-maintainer-decision', issue_number: 102, issue_url: 'https://github.com/ilokesto/ilokesto/issues/102' }),
    'issue-103': item({ issue_number: 103, issue_url: 'https://github.com/ilokesto/ilokesto/issues/103', hard_dependencies: ['issue-101'], ordering_dependencies: ['issue-102'] }),
  });
  const blockedFacts = { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts(), 'issue-102': facts(), 'issue-103': facts({ base: { head_sha: SHA_C, contains_merge_shas: false } }) } };

  // When
  const blocked = planExecuteLaneStep({ projection: current, receipts: [], facts: blockedFacts });
  const ready = planExecuteLaneStep({ projection: current, receipts: [], facts: { ...blockedFacts, items: { ...blockedFacts.items, 'issue-103': facts({ base: { head_sha: SHA_C, contains_merge_shas: true } }) } } });

  // Then
  assert.deepEqual(blocked.find(({ item_id: itemId }) => itemId === 'issue-103'), { action: 'wait', reason: 'hard-dependency-ancestry', item_id: 'issue-103', expected_revision: 10 });
  assert.deepEqual(ready.find(({ item_id: itemId }) => itemId === 'issue-103'), { action: 'append', event: 'item.dispatched', item_id: 'issue-103', expected_revision: 10, base_sha: SHA_C, required_merge_shas: [SHA_B] });
});

test('planner blocks a queued item when a hard prerequisite terminalizes before merge', () => {
  const current = projection({
    'issue-101': item({ state: 'blocked-retry-exhausted', attempt: 3 }),
    'issue-102': item({ issue_number: 102, issue_url: 'https://github.com/ilokesto/ilokesto/issues/102', hard_dependencies: ['issue-101'] }),
  });

  const actions = planExecuteLaneStep({
    projection: current,
    receipts: [],
    facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts(), 'issue-102': facts() } },
  });

  assert.deepEqual(actions, [{
    action: 'append', event: 'item.blocked', item_id: 'issue-102', expected_revision: 10,
    error_state: 'blocked-child-contract-error', error_code: 'ERR_SIDE_EFFECT_PRECONDITION',
    reason: 'hard-dependency-terminal-before-merge:issue-101',
  }]);
});

test('planner treats a full durable merge SHA as hard readiness after cleanup blocks', () => {
  const current = projection({
    'issue-101': item({ state: 'blocked-dirty-worktree', attempt: 1, merge_sha: SHA_B }),
    'issue-102': item({ issue_number: 102, issue_url: 'https://github.com/ilokesto/ilokesto/issues/102', hard_dependencies: ['issue-101'] }),
    'issue-103': item({ state: 'blocked-maintainer-decision', issue_number: 103, issue_url: 'https://github.com/ilokesto/ilokesto/issues/103' }),
    'issue-104': item({ issue_number: 104, issue_url: 'https://github.com/ilokesto/ilokesto/issues/104', ordering_dependencies: ['issue-103'] }),
  });
  const itemFacts = Object.fromEntries(Object.keys(current.items).map((itemId) => [itemId, facts({ base: { head_sha: SHA_C, contains_merge_shas: true } })]));

  const actions = planExecuteLaneStep({ projection: current, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: itemFacts } });

  assert.deepEqual(actions, [
    { action: 'append', event: 'item.dispatched', item_id: 'issue-102', expected_revision: 10, base_sha: SHA_C, required_merge_shas: [SHA_B] },
    { action: 'append', event: 'item.dispatched', item_id: 'issue-104', expected_revision: 10, base_sha: SHA_C, required_merge_shas: [] },
  ]);

  current.items['issue-101'].merge_sha = 'b'.repeat(39);
  const malformed = planExecuteLaneStep({ projection: current, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: itemFacts } });
  assert.deepEqual(malformed[0], {
    action: 'append', event: 'item.blocked', item_id: 'issue-102', expected_revision: 10,
    error_state: 'blocked-child-contract-error', error_code: 'ERR_SIDE_EFFECT_PRECONDITION',
    reason: 'hard-dependency-terminal-before-merge:issue-101',
  });
});

test('planner reconciles push and PR-create crash windows without repeating effects', () => {
  // Given
  const implementation = item({ state: 'implementation-complete', attempt: 1, dispatch_id: 'dispatch-101', commit_sha: SHA_A, branch: 'issue-101-a', worktree: '.worktrees/issue-101-a' });
  const current = projection({ 'issue-101': implementation });
  const root = { tracked: [], untracked: [], head_sha: SHA_A };
  const matchingPr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_A, checks: [], merged: false, merge_sha: null };

  // When
  const beforePush = planExecuteLaneStep({ projection: current, receipts: [], facts: { root, items: { 'issue-101': facts() } } });
  const afterPush = planExecuteLaneStep({ projection: current, receipts: [], facts: { root, items: { 'issue-101': facts({ remote_branch: { exists: true, head_sha: SHA_A } }) } } });
  const afterPrCreate = planExecuteLaneStep({ projection: current, receipts: [], facts: { root, items: { 'issue-101': facts({ remote_branch: { exists: true, head_sha: SHA_A }, pr: matchingPr }) } } });

  // Then
  assert.equal(beforePush[0].operation, 'branch-push');
  assert.equal(afterPush[0].operation, 'pr-create');
  assert.deepEqual(afterPrCreate[0], { action: 'append', event: 'pr.opened', item_id: 'issue-101', expected_revision: 10, pr_number: 501, head_sha: SHA_A });
});

test('planner invalidates the exact pending review and check identities on changed head', () => {
  // Given
  const current = projection({
    'issue-101': item({
      state: 'in-review', attempt: 1, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A,
      pending_review: { receipt_id: 'review-start-501', checks: [{ name: 'ci', run_id: 7001, head_sha: SHA_A }] },
    }),
  });
  const pr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_B, checks: [{ name: 'ci', run_id: 8001, status: 'PENDING', head_sha: SHA_B }], merged: false, merge_sha: null };

  // When
  const actions = planExecuteLaneStep({ projection: current, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ pr }) } } });

  // Then
  assert.deepEqual(actions[0], {
    action: 'append', event: 'evidence.invalidated', item_id: 'issue-101', expected_revision: 10, previous_head_sha: SHA_A, new_head_sha: SHA_B,
    superseded_review_receipt_ids: ['review-start-501'], superseded_check_run_ids: [7001],
  });
});

test('planner makes a repeated blocker terminal immediately on the same PR', () => {
  // Given
  const current = projection({
    'issue-101': item({ state: 'in-review', attempt: 2, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A, pending_review: { receipt_id: 'review-start-2', checks: [{ name: 'ci', run_id: 7003, head_sha: SHA_A }] } }),
  });
  const receipts = [{ event: 'review.completed', item_id: 'issue-101', payload: { outcome: 'block', blocker_signatures: ['code:repeat'] } }];
  const pr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_A, checks: [{ name: 'ci', run_id: 7003, status: 'PASS', head_sha: SHA_A }], merged: false, merge_sha: null };

  // When
  const actions = planExecuteLaneStep({ projection: current, receipts, facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ pr, review_result: { outcome: 'block', blocker_signatures: ['code:repeat'] } }) } } });

  // Then
  assert.deepEqual(actions[0], { action: 'append', event: 'item.blocked', item_id: 'issue-101', expected_revision: 10, error_state: 'blocked-retry-exhausted', error_code: 'ERR_SIDE_EFFECT_PRECONDITION', reason: 'repeated-blocker-signature' });
});

test('planner permits the third fix-back by advancing attempt 3 to attempt 4', () => {
  const pr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_A, checks: [{ name: 'ci', run_id: 7003, status: 'PASS', head_sha: SHA_A }], merged: false, merge_sha: null };
  const pendingReview = projection({
    'issue-101': item({ state: 'in-review', attempt: 3, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A, pending_review: { receipt_id: 'review-start-3', checks: [{ name: 'ci', run_id: 7003, head_sha: SHA_A }] } }),
  });
  const fixBackPending = projection({
    'issue-101': item({ state: 'fix-back-pending', attempt: 3, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A, review: { receipt_id: 'review-block-3', blocker_signatures: ['code:new'] } }),
  });

  const review = planExecuteLaneStep({ projection: pendingReview, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ pr, review_result: { outcome: 'block', blocker_signatures: ['code:new'] } }) } } });
  const fixBack = planExecuteLaneStep({ projection: fixBackPending, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ pr }) } } });

  assert.equal(review[0].event, 'review.completed');
  assert.deepEqual(fixBack[0], { action: 'external', operation: 'fix-back', item_id: 'issue-101', expected_revision: 10, attempt: 4, blocker_signatures: ['code:new'] });
});

test('planner gates merge cleanup and root sync through exact wrapper operations and authority keys', () => {
  // Given
  const authority = { receipt_id: 'authority-7', repository: 'ilokesto/ilokesto', lane_id: 'lane-task-7', issues: [101], operations: ['merge', 'cleanup', 'root-sync'], consumed_operations: [] };
  const mergeReady = projection({ 'issue-101': item({ state: 'merge-ready', attempt: 1, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A }) }, { authority });
  const pr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_A, checks: [], merged: false, merge_sha: null };

  // When
  const merge = planExecuteLaneStep({ projection: mergeReady, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ pr }) } } });
  const cleanup = planExecuteLaneStep({ projection: projection({ 'issue-101': item({ state: 'cleanup-pending', attempt: 1, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A, merge_sha: SHA_B }) }, { authority }), receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ pr: { ...pr, merged: true, merge_sha: SHA_B } }) } } });
  const rootSync = planExecuteLaneStep({ projection: projection({ 'issue-101': item({ state: 'done', attempt: 1 }) }, { authority }), receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts() } } });

  // Then
  assert.equal(merge[0].operation, 'merge');
  assert.equal(cleanup[0].operation, 'cleanup');
  assert.equal(rootSync.at(-1).operation, 'root-sync');
  assert.equal(merge[0].authority_key, 'merge:101');
  assert.equal(cleanup[0].authority_key, 'cleanup:101');
  assert.equal(rootSync.at(-1).authority_key, 'root-sync');
});

test('planner persists proven external identity conflicts and never auto-repairs them', () => {
  // Given
  const current = projection({ 'issue-101': item({ state: 'implementation-complete', attempt: 1, dispatch_id: 'dispatch-101', commit_sha: SHA_A, branch: 'issue-101-a', worktree: '.worktrees/issue-101-a' }) });
  const conflictingPr = { number: 501, issue_number: 999, branch: 'other-branch', head_sha: SHA_B, checks: [], merged: false, merge_sha: null };

  // When
  const actions = planExecuteLaneStep({ projection: current, receipts: [], facts: { root: { tracked: [], untracked: [], head_sha: SHA_A }, items: { 'issue-101': facts({ remote_branch: { exists: true, head_sha: SHA_B }, pr: conflictingPr }) } } });

  // Then
  assert.deepEqual(actions[0], { action: 'append', event: 'item.blocked', item_id: 'issue-101', expected_revision: 10, error_state: 'blocked-ledger-conflict', error_code: 'ERR_INVALID_RECEIPT', reason: 'external-identity-conflict' });
});

test('planner refuses active completion and unauthorized effects', () => {
  // Given
  const active = projection({ 'issue-101': item({ state: 'implementing', attempt: 1, dispatch_id: 'dispatch-101' }) });
  const mergeReady = projection({ 'issue-101': item({ state: 'merge-ready', attempt: 1, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A }) });
  const root = { tracked: [], untracked: [], head_sha: SHA_A };
  const pr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_A, checks: [], merged: false, merge_sha: null };

  // When
  const activeActions = planExecuteLaneStep({ projection: active, receipts: [], facts: { root, items: { 'issue-101': facts() } } });
  const unauthorized = planExecuteLaneStep({ projection: mergeReady, receipts: [], facts: { root, items: { 'issue-101': facts({ pr }) } } });

  // Then
  assert.deepEqual(activeActions[0], { action: 'wait', reason: 'active-child', item_id: 'issue-101', expected_revision: 10 });
  assert.deepEqual(unauthorized[0], { action: 'wait', reason: 'merge-authority', item_id: 'issue-101', expected_revision: 10 });
});

test('planner rejects stale PR heads and mismatched authority identities before effects', () => {
  // Given
  const implementation = projection({ 'issue-101': item({ state: 'implementation-complete', attempt: 1, dispatch_id: 'dispatch-101', commit_sha: SHA_A, branch: 'issue-101-a', worktree: '.worktrees/issue-101-a' }) });
  const mismatchedAuthority = { receipt_id: 'authority-7', repository: 'other/repository', lane_id: 'lane-task-7', issues: [101], operations: ['merge'], consumed_operations: [] };
  const mergeReady = projection({ 'issue-101': item({ state: 'merge-ready', attempt: 1, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A }) }, { authority: mismatchedAuthority });
  const root = { tracked: [], untracked: [], head_sha: SHA_A };
  const stalePr = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_B, checks: [], merged: false, merge_sha: null };
  const currentPr = { ...stalePr, head_sha: SHA_A };

  // When
  const stale = planExecuteLaneStep({ projection: implementation, receipts: [], facts: { root, items: { 'issue-101': facts({ remote_branch: { exists: true, head_sha: SHA_A }, pr: stalePr }) } } });
  const unauthorized = planExecuteLaneStep({ projection: mergeReady, receipts: [], facts: { root, items: { 'issue-101': facts({ pr: currentPr }) } } });

  // Then
  assert.equal(stale[0].error_state, 'blocked-ledger-conflict');
  assert.deepEqual(unauthorized[0], { action: 'wait', reason: 'merge-authority', item_id: 'issue-101', expected_revision: 10 });
});

test('planner blocks mismatched cleanup identity and closes an all-terminal failed lane', () => {
  // Given
  const authority = { receipt_id: 'authority-7', repository: 'ilokesto/ilokesto', lane_id: 'lane-task-7', issues: [101], operations: ['cleanup'], consumed_operations: [] };
  const cleanupPending = projection({ 'issue-101': item({ state: 'cleanup-pending', attempt: 1, dispatch_id: 'dispatch-101', branch: 'issue-101-a', worktree: '.worktrees/issue-101-a', pr_number: 501, head_sha: SHA_A, merge_sha: SHA_B }) }, { authority });
  const failed = projection({ 'issue-101': item({ state: 'blocked-retry-exhausted', attempt: 3 }) });
  const wrongMerge = { number: 501, issue_number: 101, branch: 'issue-101-a', head_sha: SHA_A, checks: [], merged: true, merge_sha: SHA_C };
  const root = { tracked: [], untracked: [], head_sha: SHA_A };

  // When
  const cleanup = planExecuteLaneStep({ projection: cleanupPending, receipts: [], facts: { root, items: { 'issue-101': facts({ pr: wrongMerge }) } } });
  const terminal = planExecuteLaneStep({ projection: failed, receipts: [], facts: { root, items: { 'issue-101': facts() } } });

  // Then
  assert.equal(cleanup[0].error_state, 'blocked-ledger-conflict');
  assert.deepEqual(terminal[0], {
    action: 'append', event: 'workflow.blocked', item_id: null, expected_revision: 10,
    terminal_items: [{ item_id: 'issue-101', error_state: 'blocked-retry-exhausted' }],
  });
});
