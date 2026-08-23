export const SHA_A = 'a'.repeat(40);
export const SHA_B = 'b'.repeat(40);
export const SHA_C = 'c'.repeat(40);
export const DIGEST = 'd'.repeat(64);
export const REPOSITORY = 'ilokesto/ilokesto';

const producers = {
  'workflow.started': 'supervisor',
  'item.dispatched': 'supervisor',
  'worker.started': 'supervisor from dispatch receipt',
  'worker.completed': 'supervisor after verifying child receipt',
  'pr.opened': 'supervisor',
  'pr.updated': 'supervisor',
  'review.started': 'supervisor',
  'review.completed:merge': 'supervisor after all reviewers',
  'review.completed:block': 'supervisor',
  'fix_back.started': 'supervisor',
  'merge.completed': 'authority-gated merge wrapper',
  'cleanup.started': 'supervisor',
  'cleanup.completed': 'authority-gated cleanup wrapper or supervisor skip',
  'root_sync.skipped': 'authority-gated root-sync wrapper or supervisor skip',
  'item.blocked': 'supervisor/guarded wrapper',
  'release_handoff.created': 'supervisor',
  'workflow.completed': 'supervisor',
};

export function issue(issueNumber) {
  return {
    issue_number: issueNumber,
    issue_url: `https://github.com/${REPOSITORY}/issues/${String(issueNumber)}`,
    branch: `issue-${String(issueNumber)}-e2e`,
    worktree: `.worktrees/issue-${String(issueNumber)}-e2e`,
  };
}

export function laneCreation(laneId, issueNumbers = [101]) {
  const selected = issueNumbers.map((issueNumber) => issue(issueNumber));
  const createdAt = '2026-08-20T10:00:00.000Z';
  const sourceSelection = {
    version: 1,
    handoff_id: `source-${laneId}`,
    event: 'source.selected',
    repository: REPOSITORY,
    created_at: createdAt,
    issues: selected.map(({ issue_number: issueNumber, issue_url: issueUrl }) => ({
      issue_number: issueNumber,
      issue_url: issueUrl,
      source: 'direct',
      approval: 'explicit',
      provenance: { kind: 'direct-input', reference: `todo-9-${String(issueNumber)}` },
    })),
  };
  const laneReceipt = {
    version: 1,
    receipt_id: `${laneId}-created`,
    event: 'lane.created',
    lane_id: laneId,
    item_id: null,
    attempt: 0,
    dispatch_id: null,
    producer: 'supervisor create operation',
    expected_revision: 0,
    repository: REPOSITORY,
    base_branch: 'main',
    created_at: createdAt,
    payload: {
      source_selection_handoff_id: sourceSelection.handoff_id,
      items: selected.map(({ issue_number: issueNumber, issue_url: issueUrl }) => ({
        item_id: `issue-${String(issueNumber)}`,
        issue_number: issueNumber,
        issue_url: issueUrl,
        hard_dependencies: [],
        ordering_dependencies: [],
      })),
    },
  };
  return { lane_receipt: laneReceipt, source_selection: sourceSelection };
}

export function receipt(laneId, event, revision, overrides = {}) {
  const itemId = overrides.item_id === undefined ? 'issue-101' : overrides.item_id;
  const attempt = overrides.attempt ?? (itemId === null ? 0 : 1);
  const dispatchId = overrides.dispatch_id === undefined
    ? (itemId === null ? null : `dispatch-${itemId}`)
    : overrides.dispatch_id;
  const outcome = overrides.payload?.outcome;
  return {
    version: 1,
    receipt_id: `${laneId}-${String(revision + 1)}-${event.replaceAll('.', '-')}`,
    event,
    lane_id: laneId,
    item_id: itemId,
    attempt,
    dispatch_id: dispatchId,
    producer: producers[outcome ? `${event}:${outcome}` : event],
    expected_revision: revision,
    repository: REPOSITORY,
    base_branch: 'main',
    created_at: `2026-08-20T10:00:${String(revision).padStart(2, '0')}.000Z`,
    payload: {},
    ...overrides,
  };
}

export function checks(headSha = SHA_A) {
  return [{ name: 'verify', run_id: 9001, status: 'PASS', head_sha: headSha }];
}

export function evidence(receiptId) {
  return { receipt_id: receiptId, evidence_sha256: DIGEST, artifact_basename: 'task-9-workflow-ledger-handover.txt' };
}

export function verification(headSha = SHA_A) {
  return {
    command: 'node --test tests/monorepo/workflow-e2e.test.mjs',
    cwd: '.',
    started_at: '2026-08-20T10:00:04.000Z',
    finished_at: '2026-08-20T10:00:05.000Z',
    exit_code: 0,
    head_sha: headSha,
    evidence_sha256: DIGEST,
    artifact_basename: 'task-9-workflow-ledger-handover.txt',
  };
}

export function workerPayload(headSha = SHA_A, changedFiles = ['scripts/workflow/lane-ledger.mjs']) {
  return {
    ...issue(101),
    committed_head_sha: headSha,
    changed_files: changedFiles,
    verification: [verification(headSha)],
    changeset_decision: 'not-required',
    remaining_blockers: [],
  };
}

export function reviewPayload(outcome = 'merge', headSha = SHA_A) {
  const status = outcome === 'merge' ? 'PASS' : 'BLOCK';
  return {
    outcome,
    reviewed_head_sha: headSha,
    docs_release_required: false,
    reviewers: {
      contract: { status, ...evidence('review-contract') },
      code: { status, ...evidence('review-code') },
      verification: { status, ...evidence('review-verification') },
    },
    checks: checks(headSha),
    blocker_signatures: outcome === 'block' ? ['code:repeat'] : [],
    fix_back_eligible: outcome === 'block',
    remaining_fix_back_attempts: outcome === 'block' ? 3 : 0,
    non_fixable_evidence: [],
  };
}

export function lifecycleBeforeAuthority(laneId) {
  const bound = issue(101);
  return [
    receipt(laneId, 'workflow.started', 1, { item_id: null }),
    receipt(laneId, 'item.dispatched', 2, { attempt: 0, payload: { base_sha: SHA_A, required_merge_shas: [], base_contains_merge_shas: true } }),
    receipt(laneId, 'worker.started', 3, { payload: bound }),
    receipt(laneId, 'worker.completed', 4, { payload: workerPayload() }),
    receipt(laneId, 'pr.opened', 5, { pr_number: 101, head_sha: SHA_A, payload: { ...bound, committed_head_sha: SHA_A } }),
    receipt(laneId, 'review.started', 6, { pr_number: 101, head_sha: SHA_A, payload: { ...bound, checks: checks() } }),
    receipt(laneId, 'review.completed', 7, { pr_number: 101, head_sha: SHA_A, payload: reviewPayload() }),
  ];
}

export function lifecycleThroughFixBack(laneId) {
  const bound = issue(101);
  return [
    ...lifecycleBeforeAuthority(laneId).slice(0, 6),
    receipt(laneId, 'review.completed', 7, { pr_number: 101, head_sha: SHA_A, payload: reviewPayload('block') }),
    receipt(laneId, 'fix_back.started', 8, {
      attempt: 2,
      pr_number: 101,
      head_sha: SHA_A,
      payload: {
        ...bound,
        blocker_signatures: ['code:repeat'],
        review_receipt_id: `${laneId}-8-review-completed`,
      },
    }),
    receipt(laneId, 'worker.completed', 9, {
      attempt: 2,
      payload: workerPayload(SHA_B, ['scripts/workflow/fixed.mjs']),
    }),
    receipt(laneId, 'pr.updated', 10, {
      attempt: 2,
      pr_number: 101,
      head_sha: SHA_B,
      payload: { ...bound, committed_head_sha: SHA_B },
    }),
    receipt(laneId, 'review.started', 11, {
      attempt: 2,
      pr_number: 101,
      head_sha: SHA_B,
      payload: { ...bound, checks: checks(SHA_B) },
    }),
    receipt(laneId, 'review.completed', 12, {
      attempt: 2,
      pr_number: 101,
      head_sha: SHA_B,
      payload: reviewPayload('merge', SHA_B),
    }),
  ];
}
