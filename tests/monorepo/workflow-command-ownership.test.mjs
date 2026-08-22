import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  LaneLedgerError,
  createReceipt,
  replayReceipts,
  validateLegalTransition,
} from '../../scripts/workflow/lane-ledger.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const DIGEST = 'd'.repeat(64);
const ISSUE = {
  issue_number: 101,
  issue_url: 'https://github.com/ilokesto/ilokesto/issues/101',
  branch: 'issue-101-test',
  worktree: '.worktrees/issue-101-test',
};

async function commandContract(name) {
  const content = await readFile(new URL(`../../.opencode/commands/${name}.md`, import.meta.url), 'utf8');
  const match = content.match(/```workflow-command-contract\n([\s\S]*?)\n```/u);
  assert.ok(match, `${name} must expose one workflow-command-contract block`);
  return JSON.parse(match[1]);
}

function receipt(event, revision, overrides = {}) {
  const outcome = overrides.payload?.outcome;
  const producers = {
    'lane.created': 'supervisor create operation',
    'workflow.started': 'supervisor',
    'item.dispatched': 'supervisor',
    'worker.started': 'supervisor from dispatch receipt',
    'worker.completed': 'supervisor after verifying child receipt',
    'pr.opened': 'supervisor',
    'review.started': 'supervisor',
    'review.completed:merge': 'supervisor after all reviewers',
    'item.blocked': 'supervisor/guarded wrapper',
  };
  return createReceipt({
    version: 1,
    receipt_id: `task-5-${String(revision + 1)}-${event.replaceAll('.', '-')}`,
    event,
    lane_id: 'lane-task-5',
    item_id: event.startsWith('workflow.') || event === 'lane.created' ? null : 'issue-101',
    attempt: event.startsWith('workflow.') || event === 'lane.created' ? 0 : 1,
    dispatch_id: event.startsWith('workflow.') || event === 'lane.created' ? null : 'dispatch-101-1',
    producer: producers[outcome ? `${event}:${outcome}` : event],
    expected_revision: revision,
    repository: 'ilokesto/ilokesto',
    base_branch: 'main',
    created_at: `2026-08-18T09:00:${String(revision).padStart(2, '0')}.000Z`,
    payload: {},
    ...overrides,
  });
}

function verification(headSha = SHA_A) {
  return {
    command: 'node --test tests/monorepo/workflow-command-ownership.test.mjs',
    cwd: '.',
    started_at: '2026-08-18T09:00:00.000Z',
    finished_at: '2026-08-18T09:00:01.000Z',
    exit_code: 0,
    head_sha: headSha,
    evidence_sha256: DIGEST,
    artifact_basename: 'task-5-workflow-ledger-handover.txt',
  };
}

function evidence(receiptId) {
  return {
    receipt_id: receiptId,
    evidence_sha256: DIGEST,
    artifact_basename: 'task-5-workflow-ledger-handover.txt',
  };
}

function historyThroughWorker() {
  return [
    receipt('lane.created', 0, {
      payload: {
        source_selection_handoff_id: 'source-task-5',
        items: [{ item_id: 'issue-101', issue_number: 101, issue_url: ISSUE.issue_url, hard_dependencies: [], ordering_dependencies: [] }],
      },
    }),
    receipt('workflow.started', 1),
    receipt('item.dispatched', 2, { attempt: 0, payload: { base_sha: SHA_A, required_merge_shas: [], base_contains_merge_shas: true } }),
    receipt('worker.started', 3, { payload: ISSUE }),
    receipt('worker.completed', 4, {
      payload: {
        ...ISSUE,
        committed_head_sha: SHA_A,
        changed_files: ['packages/store/src/index.ts'],
        verification: [verification()],
        changeset_decision: 'added',
        remaining_blockers: [],
      },
    }),
  ];
}

function assertCode(code) {
  return (error) => error instanceof LaneLedgerError && error.code === code;
}

test('commands declare one supervisor owner and canonical handover tokens', async () => {
  const issueToPr = await commandContract('issue-to-pr');
  const prToMerge = await commandContract('pr-to-merge');

  assert.deepEqual(issueToPr, {
    version: 1,
    command: 'issue-to-pr',
    owner: 'supervisor',
    supervisor_operations: ['worktree.create', 'branch.push', 'pr.create', 'pr.update', 'ledger.append'],
    worker_operations: ['edit', 'test', 'commit'],
    worker_output: 'worker.completed',
    supervisor_receipts: ['worker.started', 'worker.completed', 'pr.opened', 'pr.updated', 'item.blocked'],
    child_recovery: ['same-session-request-once', 'read-only-reconcile', 'blocked-child-contract-error'],
  });
  assert.deepEqual(prToMerge, {
    version: 1,
    command: 'pr-to-merge',
    owner: 'supervisor',
    output_event: 'review.completed',
    outcomes: ['merge', 'block', 'needs-human-check'],
    reviewer_roles: {
      base: ['contract', 'code', 'verification'],
      conditional: { docs_release: 'docs_release_required' },
    },
    identity: ['repository', 'lane_id', 'item_id', 'attempt', 'dispatch_id', 'expected_revision', 'base_branch', 'pr_number', 'head_sha', 'checks'],
    fix_back_identity: ['repository', 'lane_id', 'item_id', 'attempt', 'dispatch_id', 'expected_revision', 'base_branch', 'pr_number', 'head_sha', 'branch', 'worktree', 'blocker_signatures', 'review_receipt_id'],
    child_recovery: ['same-session-request-once', 'read-only-reconcile', 'blocked-child-contract-error'],
  });
});

test('worker to supervisor to PR to base-reviewer merge validates canonically', () => {
  const history = historyThroughWorker();
  const prOpened = receipt('pr.opened', 5, { pr_number: 101, head_sha: SHA_A, payload: { ...ISSUE, committed_head_sha: SHA_A } });
  const checks = [{ name: 'ci', run_id: 5001, status: 'PASS', head_sha: SHA_A }];
  const reviewStarted = receipt('review.started', 6, { pr_number: 101, head_sha: SHA_A, payload: { ...ISSUE, checks } });
  const reviewCompleted = receipt('review.completed', 7, {
    pr_number: 101,
    head_sha: SHA_A,
    payload: {
      outcome: 'merge',
      reviewed_head_sha: SHA_A,
      docs_release_required: false,
      reviewers: {
        contract: { status: 'PASS', ...evidence('task-5-contract') },
        code: { status: 'PASS', ...evidence('task-5-code') },
        verification: { status: 'PASS', ...evidence('task-5-verification') },
      },
      checks,
      blocker_signatures: [],
      fix_back_eligible: false,
      remaining_fix_back_attempts: 0,
      non_fixable_evidence: [],
    },
  });

  const projection = replayReceipts([...history, prOpened, reviewStarted, reviewCompleted]);
  assert.equal(projection.items['issue-101'].state, 'merge-ready');
  assert.equal(projection.items['issue-101'].head_sha, SHA_A);
  assert.equal(projection.items['issue-101'].review.outcome, 'merge');
});

test('vague child output and mismatched worktree or head fail closed without a PR transition', () => {
  const implementing = replayReceipts(historyThroughWorker().slice(0, 4));
  assert.throws(() => createReceipt({ success: true }), assertCode('ERR_UNSUPPORTED_VERSION'));

  const wrongWorktree = receipt('worker.completed', 4, {
    payload: {
      ...ISSUE,
      worktree: '.worktrees/issue-101-other',
      branch: 'issue-101-other',
      committed_head_sha: SHA_A,
      changed_files: ['packages/store/src/index.ts'],
      verification: [verification()],
      changeset_decision: 'added',
      remaining_blockers: [],
    },
  });
  assert.throws(() => validateLegalTransition(implementing, wrongWorktree), assertCode('ERR_INVALID_RECEIPT'));

  const implementationComplete = replayReceipts(historyThroughWorker());
  const wrongHead = receipt('pr.opened', 5, { pr_number: 101, head_sha: SHA_B, payload: { ...ISSUE, committed_head_sha: SHA_B } });
  assert.throws(() => validateLegalTransition(implementationComplete, wrongHead), assertCode('ERR_STALE_HEAD'));

  const blocked = receipt('item.blocked', 4, {
    payload: {
      error_state: 'blocked-child-contract-error',
      error_code: 'ERR_INVALID_RECEIPT',
      evidence: [evidence('task-5-child-contract-error')],
    },
  });
  const projection = replayReceipts([...historyThroughWorker().slice(0, 4), blocked]);
  assert.equal(projection.items['issue-101'].state, 'blocked-child-contract-error');
  assert.equal(projection.items['issue-101'].pr_number, undefined);
});
