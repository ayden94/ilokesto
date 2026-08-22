import { isTerminalItemState } from './lane-ledger.mjs';

const SHA_PATTERN = /^[a-f0-9]{40}$/u;

function action(projection, itemId, value) {
  return Object.freeze({ ...value, item_id: itemId, expected_revision: projection.revision });
}

function wait(projection, itemId, reason) {
  return action(projection, itemId, { action: 'wait', reason });
}

function block(projection, itemId, reason, errorCode = 'ERR_INVALID_RECEIPT') {
  return action(projection, itemId, {
    action: 'append',
    event: 'item.blocked',
    error_state: 'blocked-ledger-conflict',
    error_code: errorCode,
    reason,
  });
}

function authorityKey(operation, issueNumber) {
  return operation === 'root-sync' ? operation : `${operation}:${String(issueNumber)}`;
}

function authorityFor(projection, operation, item) {
  const authority = projection.authority;
  const key = authorityKey(operation, item?.issue_number);
  return authority
    && authority.repository === projection.repository
    && authority.lane_id === projection.lane_id
    && authority.operations.includes(operation)
    && (item === undefined || authority.issues.includes(item.issue_number))
    && !authority.consumed_operations.includes(key)
    ? { receiptId: authority.receipt_id, key }
    : null;
}

function prIdentityMatches(item, pr) {
  return pr.issue_number === item.issue_number
    && pr.branch === item.branch
    && (item.pr_number === undefined || pr.number === item.pr_number);
}

function hasExternalConflict(item, observed) {
  if (observed.remote_branch.exists && item.commit_sha !== undefined && observed.remote_branch.head_sha !== item.commit_sha) return true;
  if (observed.worktree.exists && observed.worktree.branch !== item.branch) return true;
  if (Array.isArray(observed.pr)) return true;
  return observed.pr !== null && (!prIdentityMatches(item, observed.pr)
    || (item.commit_sha !== undefined && observed.pr.head_sha !== item.commit_sha));
}

function dependencyDecision(projection, itemId, item, observed) {
  const hard = item.hard_dependencies.map((dependencyId) => projection.items[dependencyId]);
  const terminalFailureIndex = hard.findIndex((dependency) => dependency
    && isTerminalItemState(dependency.state)
    && !SHA_PATTERN.test(dependency.merge_sha ?? ''));
  if (terminalFailureIndex !== -1) {
    return action(projection, itemId, {
      action: 'append',
      event: 'item.blocked',
      error_state: 'blocked-child-contract-error',
      error_code: 'ERR_SIDE_EFFECT_PRECONDITION',
      reason: `hard-dependency-terminal-before-merge:${item.hard_dependencies[terminalFailureIndex]}`,
    });
  }
  const hardReady = hard.every((dependency) => dependency && SHA_PATTERN.test(dependency.merge_sha ?? ''));
  if (!hardReady) return wait(projection, itemId, 'hard-dependency-merge');
  if (!item.ordering_dependencies.every((dependencyId) => isTerminalItemState(projection.items[dependencyId]?.state))) {
    return wait(projection, itemId, 'ordering-dependency');
  }
  if (!observed.base.contains_merge_shas) return wait(projection, itemId, 'hard-dependency-ancestry');
  return action(projection, itemId, {
    action: 'append',
    event: 'item.dispatched',
    base_sha: observed.base.head_sha,
    required_merge_shas: hard.map(({ merge_sha: mergeSha }) => mergeSha).sort(),
  });
}

function implementationDecision(projection, itemId, item, observed) {
  if (hasExternalConflict(item, observed)) return block(projection, itemId, 'external-identity-conflict');
  if (!observed.remote_branch.exists) return action(projection, itemId, { action: 'external', operation: 'branch-push' });
  if (observed.pr === null) return action(projection, itemId, { action: 'external', operation: 'pr-create' });
  return action(projection, itemId, {
    action: 'append',
    event: item.pr_number === undefined ? 'pr.opened' : 'pr.updated',
    pr_number: observed.pr.number,
    head_sha: observed.pr.head_sha,
  });
}

function reviewDecision(projection, receipts, itemId, item, observed) {
  const pr = observed.pr;
  if (pr === null || !prIdentityMatches(item, pr)) return block(projection, itemId, 'external-identity-conflict');
  if (pr.head_sha !== item.head_sha) {
    if (!item.pending_review) return block(projection, itemId, 'stale-reviewed-head', 'ERR_STALE_HEAD');
    return action(projection, itemId, {
      action: 'append',
      event: 'evidence.invalidated',
      previous_head_sha: item.head_sha,
      new_head_sha: pr.head_sha,
      superseded_review_receipt_ids: [item.pending_review.receipt_id],
      superseded_check_run_ids: item.pending_review.checks.map(({ run_id: runId }) => runId),
    });
  }
  if (item.state === 'pr-open') {
    return action(projection, itemId, { action: 'append', event: 'review.started', pr_number: pr.number, head_sha: pr.head_sha, checks: pr.checks });
  }
  if (observed.review_result === null) return action(projection, itemId, { action: 'external', operation: 'review-collect' });
  if (observed.review_result.outcome !== 'block') {
    return action(projection, itemId, { action: 'append', event: 'review.completed', outcome: observed.review_result.outcome, review_result: structuredClone(observed.review_result) });
  }
  const previous = receipts.some((receipt) => receipt.event === 'review.completed'
    && receipt.item_id === itemId
    && receipt.payload.outcome === 'block'
    && receipt.payload.blocker_signatures.some((signature) => observed.review_result.blocker_signatures.includes(signature)));
  if (item.attempt >= 3) {
    return action(projection, itemId, {
      action: 'append',
      event: 'item.blocked',
      error_state: 'blocked-retry-exhausted',
      error_code: 'ERR_SIDE_EFFECT_PRECONDITION',
      reason: previous ? 'repeated-blocker-after-third-attempt' : 'fix-back-attempt-budget-exhausted',
    });
  }
  return action(projection, itemId, { action: 'append', event: 'review.completed', outcome: 'block', review_result: structuredClone(observed.review_result) });
}

function effectDecision(projection, itemId, item, operation) {
  const authority = authorityFor(projection, operation, item);
  if (!authority) return wait(projection, itemId, `${operation}-authority`);
  return action(projection, itemId, {
    action: 'side-effect',
    operation,
    authority_receipt_id: authority.receiptId,
    authority_key: authority.key,
  });
}

function itemDecision(projection, receipts, itemId, item, observed) {
  switch (item.state) {
    case 'queued': return dependencyDecision(projection, itemId, item, observed);
    case 'dispatching':
    case 'implementing':
    case 'fix-back': return wait(projection, itemId, 'active-child');
    case 'implementation-complete': return implementationDecision(projection, itemId, item, observed);
    case 'pr-open':
    case 'in-review': return reviewDecision(projection, receipts, itemId, item, observed);
    case 'fix-back-pending':
      if (observed.pr === null || Array.isArray(observed.pr) || !prIdentityMatches(item, observed.pr) || observed.pr.head_sha !== item.head_sha) {
        return block(projection, itemId, 'external-identity-conflict');
      }
      return item.attempt >= 3
        ? action(projection, itemId, { action: 'append', event: 'item.blocked', error_state: 'blocked-retry-exhausted', error_code: 'ERR_SIDE_EFFECT_PRECONDITION', reason: 'fix-back-attempt-budget-exhausted' })
        : action(projection, itemId, { action: 'external', operation: 'fix-back', attempt: item.attempt + 1, blocker_signatures: item.review.blocker_signatures });
    case 'merge-ready': {
      if (observed.pr === null || !prIdentityMatches(item, observed.pr)) return block(projection, itemId, 'external-identity-conflict');
      if (observed.pr.head_sha !== item.head_sha) return block(projection, itemId, 'stale-reviewed-head', 'ERR_STALE_HEAD');
      return effectDecision(projection, itemId, item, 'merge');
    }
    case 'merged': {
      if (observed.pr === null || Array.isArray(observed.pr) || !prIdentityMatches(item, observed.pr) || observed.pr.merged !== true || observed.pr.merge_sha !== item.merge_sha) {
        return block(projection, itemId, 'external-identity-conflict');
      }
      const authority = authorityFor(projection, 'cleanup', item);
      if (!authority) return wait(projection, itemId, 'cleanup-authority');
      return action(projection, itemId, {
        action: 'append', event: 'cleanup.started', authority_receipt_id: authority.receiptId,
        tracked_baseline: [...observed.worktree.tracked], untracked_baseline: [...observed.worktree.untracked],
      });
    }
    case 'cleanup-pending':
      if (observed.pr === null || Array.isArray(observed.pr) || !prIdentityMatches(item, observed.pr) || observed.pr.merged !== true || observed.pr.merge_sha !== item.merge_sha) {
        return block(projection, itemId, 'external-identity-conflict');
      }
      return effectDecision(projection, itemId, item, 'cleanup');
    default:
      if (isTerminalItemState(item.state)) return null;
      throw new Error(`Unsupported canonical item state: ${String(item.state)}`);
  }
}

export function planExecuteLaneStep(input) {
  const { projection, receipts, facts } = input;
  if (projection.workflow_state === 'ready') {
    return [action(projection, null, { action: 'append', event: 'workflow.started' })];
  }
  const actions = Object.entries(projection.items)
    .map(([itemId, item]) => itemDecision(projection, receipts, itemId, item, facts.items[itemId]))
    .filter((candidate) => candidate !== null);
  const itemsReady = Object.values(projection.items).every((item) => item.state === 'done' || item.state === 'release-handoff');
  const allTerminal = Object.values(projection.items).every((item) => isTerminalItemState(item.state));
  if (itemsReady && projection.root_sync === 'pending') {
    const authority = authorityFor(projection, 'root-sync');
    actions.push(authority
      ? action(projection, null, { action: 'side-effect', operation: 'root-sync', authority_receipt_id: authority.receiptId, authority_key: authority.key, root_baseline: structuredClone(facts.root) })
      : wait(projection, null, 'root-sync-authority'));
  } else if (itemsReady && ['completed', 'skipped'].includes(projection.root_sync) && projection.workflow_state === 'running') {
    actions.push(action(projection, null, { action: 'append', event: 'workflow.completed', root_sync_receipt_id: projection.root_sync_receipt_id }));
  } else if (allTerminal && projection.workflow_state === 'running') {
    const terminalItems = Object.entries(projection.items)
      .filter(([, item]) => item.state !== 'done' && item.state !== 'release-handoff')
      .map(([itemId, item]) => ({ item_id: itemId, error_state: item.state }));
    actions.push(action(projection, null, { action: 'append', event: 'workflow.blocked', terminal_items: terminalItems }));
  }
  return Object.freeze(actions);
}
