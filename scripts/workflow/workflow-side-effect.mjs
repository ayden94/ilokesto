#!/usr/bin/env node
// allow: SIZE_OK - The non-injectable production CLI and its authority-gated system effects share one executable boundary.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LaneLedgerError,
  createReceipt,
  discoverWorkspaceRoot,
  validateLaneId,
  withRuntimeLockedStoredLaneTransaction,
} from './lane-ledger.mjs';

const OPERATIONS = ['merge', 'cleanup', 'root-sync'];
const SHA = /^[a-f0-9]{40}$/u;

function fail(code, message, options) {
  throw new LaneLedgerError(code, message, options);
}

function exactKeys(value, keys, field) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('ERR_INVALID_SCHEMA', `${field} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail('ERR_INVALID_SCHEMA', `${field} has missing or unknown fields`);
}

function validateRequest(request) {
  const operation = request?.operation;
  if (!OPERATIONS.includes(operation)) fail('ERR_INVALID_SCHEMA', 'operation must be merge, cleanup, or root-sync');
  exactKeys(request, operation === 'root-sync'
    ? ['operation', 'lane_id', 'expected_revision', 'authority_receipt_id']
    : ['operation', 'lane_id', 'item_id', 'expected_revision', 'authority_receipt_id'], 'request');
  validateLaneId(request.lane_id);
  if (!Number.isInteger(request.expected_revision) || request.expected_revision < 1) fail('ERR_INVALID_SCHEMA', 'expected_revision must be a positive integer');
  if (typeof request.authority_receipt_id !== 'string' || request.authority_receipt_id.length === 0) fail('ERR_INVALID_SCHEMA', 'authority_receipt_id is required');
  if (operation !== 'root-sync' && (typeof request.item_id !== 'string' || request.item_id.length === 0)) fail('ERR_INVALID_SCHEMA', 'item_id is required');
  return request;
}

function authorityKey(operation, issueNumber) {
  return operation === 'root-sync' ? 'root-sync' : `${operation}:${String(issueNumber)}`;
}

function requireAuthority(projection, request, item) {
  const authority = projection.authority;
  if (!authority || !authority.operations.includes(request.operation)) fail('ERR_AUTHORITY_MISSING', `${request.operation} authority is absent`);
  if (authority.receipt_id !== request.authority_receipt_id || authority.repository !== projection.repository || authority.lane_id !== projection.lane_id) {
    fail('ERR_AUTHORITY_MISMATCH', `${request.operation} authority identity differs`);
  }
  if (item && !authority.issues.includes(item.issue_number)) fail('ERR_AUTHORITY_MISMATCH', `${request.operation} issue is not authorized`);
  const key = authorityKey(request.operation, item?.issue_number);
  if (authority.consumed_operations.includes(key)) fail('ERR_AUTHORITY_CONSUMED', `${request.operation} authority is consumed`);
}

function itemFor(projection, request, requiredState) {
  const item = projection.items[request.item_id];
  if (!item) fail('ERR_AUTHORITY_MISMATCH', 'side effect item is absent');
  if (item.state !== requiredState) fail('ERR_SIDE_EFFECT_PRECONDITION', `${request.operation} requires ${requiredState}`);
  return item;
}

function sameChecks(expected, live) {
  if (!Array.isArray(live) || live.length !== expected.length) return false;
  const identity = (check) => `${check.name}:${String(check.run_id)}:${check.head_sha}:${check.status}`;
  return [...live].map(identity).sort().every((value, index) => value === [...expected].map(identity).sort()[index]);
}

function envelope(projection, request, item, event, payload, dependencies) {
  return createReceipt({
    version: 1,
    receipt_id: dependencies.receiptId(),
    event,
    lane_id: projection.lane_id,
    item_id: item ? request.item_id : null,
    attempt: item?.attempt ?? 0,
    dispatch_id: item?.dispatch_id ?? null,
    producer: event === 'merge.completed'
      ? 'authority-gated merge wrapper'
      : event === 'cleanup.blocked'
        ? 'cleanup wrapper'
        : event === 'root_sync.blocked'
          ? 'root-sync wrapper'
          : event.startsWith('cleanup.')
            ? 'authority-gated cleanup wrapper or supervisor skip'
            : 'authority-gated root-sync wrapper or supervisor skip',
    expected_revision: projection.revision,
    repository: projection.repository,
    base_branch: projection.base_branch,
    created_at: dependencies.now(),
    ...(item ? { pr_number: item.pr_number, head_sha: item.head_sha } : {}),
    payload,
  });
}

function evidenceFor(reason, live, receiptId) {
  return {
    receipt_id: `${receiptId}-evidence`,
    evidence_sha256: createHash('sha256').update(JSON.stringify({ reason, live })).digest('hex'),
    artifact_basename: 'task-6-workflow-side-effect.txt',
  };
}

async function mergeEffect(context, dependencies) {
  const { projection, request, append } = context;
  const item = itemFor(projection, request, 'merge-ready');
  requireAuthority(projection, request, item);
  const live = await dependencies.effects.inspectMerge({ repository: projection.repository, pr_number: item.pr_number, head_sha: item.head_sha, checks: item.review.checks });
  if (live.head_sha !== item.head_sha) fail('ERR_STALE_HEAD', 'live PR head differs from reviewed head');
  if (!sameChecks(item.review.checks, live.checks) || live.checks.some((check) => check.status !== 'PASS')) {
    fail('ERR_SIDE_EFFECT_PRECONDITION', 'merge live prerequisites are not satisfied');
  }
  const effect = live.merged === true
    ? { merge_sha: live.merge_sha }
    : await dependencies.effects.merge({ repository: projection.repository, pr_number: item.pr_number, method: 'squash', expected_head_sha: item.head_sha, checks: item.review.checks });
  if (!SHA.test(effect.merge_sha ?? '')) fail('ERR_SIDE_EFFECT_PRECONDITION', 'merge did not return a full merge SHA');
  const receipt = envelope(projection, request, item, 'merge.completed', {
    issue_number: item.issue_number,
    authority_receipt_id: request.authority_receipt_id,
    review_receipt_id: item.review.receipt_id,
    checks: item.review.checks,
    merge_sha: effect.merge_sha,
    method: 'squash',
  }, dependencies);
  return append(receipt);
}

async function cleanupEffect(context, dependencies) {
  const { projection, request, append } = context;
  const item = itemFor(projection, request, 'cleanup-pending');
  requireAuthority(projection, request, item);
  const live = await dependencies.effects.inspectCleanup({ repository: projection.repository, pr_number: item.pr_number, merge_sha: item.merge_sha, head_sha: item.head_sha, branch: item.branch, worktree: item.worktree });
  if (live.merged !== true || live.merge_sha !== item.merge_sha) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup requires the matching completed merge');
  if (live.tracked_conflicts.length > 0 || live.untracked_conflicts.length > 0) {
    const receipt = envelope(projection, request, item, 'cleanup.blocked', {
      authority_receipt_id: request.authority_receipt_id,
      branch: item.branch,
      worktree: item.worktree,
      tracked_conflicts: live.tracked_conflicts,
      untracked_conflicts: live.untracked_conflicts,
    }, dependencies);
    return append(receipt);
  }
  if (typeof live.remote_branch_exists !== 'boolean') fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup remote inspection did not report branch existence');
  if (live.remote_branch_exists === true && !SHA.test(live.remote_branch_sha ?? '')) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup remote inspection did not return a full branch SHA');
  if (live.remote_branch_exists === false && live.remote_branch_sha !== null) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup remote absence inspection is inconsistent');
  if (live.remote_branch_sha !== null && live.remote_branch_sha !== item.head_sha) fail('ERR_STALE_HEAD', 'remote branch differs from the reviewed head');
  if (live.worktree_exists === false && live.local_branch_exists === false && live.remote_branch_sha === null) {
    const receipt = envelope(projection, request, item, 'cleanup.skipped', {
      authority_receipt_id: request.authority_receipt_id,
      branch: item.branch,
      worktree: item.worktree,
      reason: 'already-removed',
    }, dependencies);
    return append(receipt);
  }
  const effect = await dependencies.effects.cleanup({
    repository: projection.repository,
    pr_number: item.pr_number,
    merge_sha: item.merge_sha,
    head_sha: item.head_sha,
    expected_local_sha: item.head_sha,
    expected_remote_sha: live.remote_branch_sha,
    expected_worktree_realpath: live.worktree_realpath ?? null,
    tracked_baseline: live.tracked_conflicts,
    untracked_baseline: live.untracked_conflicts,
    branch: item.branch,
    worktree: item.worktree,
  });
  if (effect.blocked === true) {
    const receipt = envelope(projection, request, item, 'cleanup.blocked', {
      authority_receipt_id: request.authority_receipt_id,
      branch: item.branch,
      worktree: item.worktree,
      tracked_conflicts: effect.tracked_conflicts,
      untracked_conflicts: effect.untracked_conflicts,
    }, dependencies);
    return append(receipt);
  }
  const cleanupProof = effect.worktree_removed === true && effect.local_branch_deleted === true && effect.remote_branch_deleted === true && effect.remote_branch_sha === null;
  if (effect.complete !== true || !cleanupProof) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup did not prove every bound artifact absent');
  const receipt = envelope(projection, request, item, 'cleanup.completed', {
    authority_receipt_id: request.authority_receipt_id,
    branch: item.branch,
    worktree: item.worktree,
    worktree_removed: effect.worktree_removed,
    local_branch_deleted: effect.local_branch_deleted,
    remote_branch_deleted: effect.remote_branch_deleted,
  }, dependencies);
  return append(receipt);
}

async function rootSyncEffect(context, dependencies) {
  const { projection, request, append } = context;
  if (!Object.values(projection.items).every((item) => item.state === 'done' || item.state === 'release-handoff') || projection.root_sync !== 'pending') {
    fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync requires a ready lane');
  }
  requireAuthority(projection, request);
  const live = await dependencies.effects.inspectRootSync({ repository: projection.repository, base_branch: projection.base_branch });
  const blockedReason = live.dirty ? 'dirty-root' : live.fast_forward ? null : 'non-ff';
  if (blockedReason) {
    const id = dependencies.receiptId();
    const receipt = envelope(projection, request, null, 'root_sync.blocked', {
      authority_receipt_id: request.authority_receipt_id,
      reason: blockedReason,
      evidence: evidenceFor(blockedReason, live, id),
    }, { ...dependencies, receiptId: () => id });
    return append(receipt);
  }
  if (live.head_sha === live.remote_head_sha) {
    const receipt = envelope(projection, request, null, 'root_sync.skipped', {
      authority_receipt_id: request.authority_receipt_id,
      reason: 'already-current',
    }, dependencies);
    return append(receipt);
  }
  const effect = await dependencies.effects.rootSync({ repository: projection.repository, base_branch: projection.base_branch, expected_local_sha: live.head_sha, expected_head_sha: live.remote_head_sha });
  if (effect.head_sha !== live.remote_head_sha || !SHA.test(effect.head_sha ?? '')) fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync did not reach the inspected remote head');
  const receipt = envelope(projection, request, null, 'root_sync.completed', {
    authority_receipt_id: request.authority_receipt_id,
    head_sha: effect.head_sha,
    method: 'ff-only',
  }, dependencies);
  return append(receipt);
}

export async function runWorkflowSideEffect(input, injected = {}) {
  const request = validateRequest(structuredClone(input));
  const dependencies = {
    ledger: injected.ledger,
    effects: injected.effects ?? createSystemEffects(),
    now: injected.now ?? (() => new Date().toISOString()),
    receiptId: injected.receiptId ?? (() => `side-effect-${randomUUID()}`),
  };
  const operation = async ({ projection, append }) => {
    if (projection.lane_id !== request.lane_id || projection.revision !== request.expected_revision) fail('ERR_REVISION_CONFLICT', 'expected revision no longer matches');
    if (request.operation === 'merge') return mergeEffect({ projection, request, append }, dependencies);
    if (request.operation === 'cleanup') return cleanupEffect({ projection, request, append }, dependencies);
    return rootSyncEffect({ projection, request, append }, dependencies);
  };
  if (dependencies.ledger) return dependencies.ledger.withLockedLane(request.lane_id, operation);
  return withRuntimeLockedStoredLaneTransaction(discoverWorkspaceRoot(), request.lane_id, 'side-effect', operation);
}

function command(file, args, cwd) {
  return execFileSync(file, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function jsonCommand(file, args, cwd) {
  return JSON.parse(command(file, args, cwd));
}

export function createSystemEffects(workspace = discoverWorkspaceRoot()) {
  const canonicalWorkspace = realpathSync(workspace);

  function normalizeGitHubRepository(remoteUrl) {
    const patterns = [
      /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/u,
      /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/u,
      /^ssh:\/\/git@github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/u,
    ];
    for (const pattern of patterns) {
      const match = remoteUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function assertRepositoryIdentity(repository) {
    const topLevel = realpathSync(command('git', ['rev-parse', '--show-toplevel'], canonicalWorkspace));
    if (topLevel !== canonicalWorkspace) fail('ERR_SIDE_EFFECT_PRECONDITION', 'side effect workspace is not the canonical repository root');
    const remoteUrl = command('git', ['config', '--get', 'remote.origin.url'], canonicalWorkspace);
    if (normalizeGitHubRepository(remoteUrl) !== repository) fail('ERR_SIDE_EFFECT_PRECONDITION', 'origin does not match the authorized repository');
  }

  function inspectRemoteBranch(repository, branch) {
    assertRepositoryIdentity(repository);
    const ref = `refs/heads/${branch}`;
    const lines = command('git', ['ls-remote', '--heads', 'origin', ref], canonicalWorkspace).split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    if (lines.length !== 1) fail('ERR_SIDE_EFFECT_PRECONDITION', 'remote branch inspection returned multiple refs');
    const [headSha, remoteRef, ...extra] = lines[0].split(/\s+/u);
    if (!SHA.test(headSha ?? '') || remoteRef !== ref || extra.length > 0) fail('ERR_SIDE_EFFECT_PRECONDITION', 'remote branch inspection returned an invalid ref');
    return headSha;
  }

  function readLocalRef(ref) {
    const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', ref], { cwd: canonicalWorkspace, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status === 1) return null;
    if (result.status !== 0) fail('ERR_SIDE_EFFECT_PRECONDITION', 'local ref inspection failed', { cause: result.error });
    const headSha = result.stdout.trim();
    if (!SHA.test(headSha)) fail('ERR_SIDE_EFFECT_PRECONDITION', 'local ref inspection returned an invalid SHA');
    return headSha;
  }

  function registeredWorktrees() {
    const output = command('git', ['worktree', 'list', '--porcelain'], canonicalWorkspace);
    if (output.length === 0) return [];
    return output.split('\n\n').map((record) => {
      const fields = new Map(record.split('\n').map((line) => {
        const separator = line.indexOf(' ');
        return separator === -1 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
      }));
      return { path: fields.get('worktree'), headSha: fields.get('HEAD'), branchRef: fields.get('branch') ?? null };
    });
  }

  function worktreeStatus(path) {
    const lines = command('git', ['-C', path, 'status', '--porcelain=v1', '--untracked-files=all'], canonicalWorkspace).split('\n').filter(Boolean);
    return {
      tracked: lines.filter((line) => !line.startsWith('?? ')).map((line) => line.slice(3)),
      untracked: lines.filter((line) => line.startsWith('?? ')).map((line) => line.slice(3)),
    };
  }

  function inspectWorktreeIdentity(branch, worktree, expectedHeadSha) {
    const path = resolve(canonicalWorkspace, worktree);
    const ref = `refs/heads/${branch}`;
    const localBranchSha = readLocalRef(ref);
    const exists = existsSync(path);
    const records = registeredWorktrees().filter((record) => {
      if (!record.path) return false;
      const registeredPath = existsSync(record.path) ? realpathSync(record.path) : resolve(record.path);
      const targetPath = exists ? realpathSync(path) : path;
      return registeredPath === targetPath;
    });
    if (!exists) {
      if (records.length > 0) fail('ERR_SIDE_EFFECT_PRECONDITION', 'absent cleanup worktree remains registered');
      if (localBranchSha !== null && localBranchSha !== expectedHeadSha) fail('ERR_STALE_HEAD', 'local cleanup branch differs from the reviewed head');
      return { path, exists: false, realpath: null, localBranchSha, tracked: [], untracked: [] };
    }
    if (records.length !== 1) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup worktree path is not uniquely registered');
    const realpath = realpathSync(path);
    const record = records[0];
    const currentBranch = command('git', ['-C', path, 'branch', '--show-current'], canonicalWorkspace);
    const worktreeHeadSha = command('git', ['-C', path, 'rev-parse', 'HEAD'], canonicalWorkspace);
    if (record.branchRef !== ref || currentBranch !== branch) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup worktree branch identity differs');
    if (record.headSha !== expectedHeadSha || worktreeHeadSha !== expectedHeadSha || localBranchSha !== expectedHeadSha) fail('ERR_STALE_HEAD', 'cleanup worktree or local branch differs from the reviewed head');
    return { path, exists: true, realpath, localBranchSha, ...worktreeStatus(path) };
  }

  function inspectRootIdentity(repository, baseBranch) {
    assertRepositoryIdentity(repository);
    const branch = command('git', ['branch', '--show-current'], canonicalWorkspace);
    if (branch !== baseBranch) fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync is not checked out on the authorized base branch');
    const dirty = command('git', ['status', '--porcelain=v1', '--untracked-files=all'], canonicalWorkspace).length > 0;
    const headSha = command('git', ['rev-parse', 'HEAD'], canonicalWorkspace);
    const remoteHeadSha = inspectRemoteBranch(repository, baseBranch);
    if (!SHA.test(headSha) || !SHA.test(remoteHeadSha ?? '')) fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync head inspection returned an invalid SHA');
    const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', headSha, remoteHeadSha], { cwd: canonicalWorkspace, stdio: 'ignore' });
    return { dirty, head_sha: headSha, remote_head_sha: remoteHeadSha, fast_forward: ancestry.status === 0 };
  }

  const effects = {
    async inspectMerge({ repository, pr_number: prNumber, head_sha: headSha }) {
      const pr = jsonCommand('gh', ['pr', 'view', String(prNumber), '--repo', repository, '--json', 'headRefOid,mergedAt,mergeCommit,statusCheckRollup'], workspace);
      const checks = (pr.statusCheckRollup ?? []).map((check) => ({
        name: check.name ?? check.context,
        run_id: check.databaseId,
        status: check.conclusion === 'SUCCESS' ? 'PASS' : check.status === 'COMPLETED' ? 'FAIL' : 'PENDING',
        head_sha: pr.headRefOid ?? headSha,
      }));
      return { head_sha: pr.headRefOid, checks, merged: pr.mergedAt !== null, merge_sha: pr.mergeCommit?.oid ?? null };
    },
    async merge({ repository, pr_number: prNumber, expected_head_sha: expectedHeadSha, checks: expectedChecks }) {
      const current = await effects.inspectMerge({ repository, pr_number: prNumber, head_sha: expectedHeadSha });
      if (current.head_sha !== expectedHeadSha) fail('ERR_STALE_HEAD', 'PR head changed before merge');
      if (current.merged === true || !sameChecks(expectedChecks, current.checks) || current.checks.some((check) => check.status !== 'PASS')) fail('ERR_SIDE_EFFECT_PRECONDITION', 'checks changed before merge');
      command('gh', ['pr', 'merge', String(prNumber), '--repo', repository, '--squash', '--delete-branch=false', '--match-head-commit', expectedHeadSha], workspace);
      const pr = jsonCommand('gh', ['pr', 'view', String(prNumber), '--repo', repository, '--json', 'mergeCommit'], workspace);
      return { merge_sha: pr.mergeCommit?.oid };
    },
    async inspectCleanup({ repository, pr_number: prNumber, head_sha: headSha, branch, worktree }) {
      assertRepositoryIdentity(repository);
      const pr = jsonCommand('gh', ['pr', 'view', String(prNumber), '--repo', repository, '--json', 'headRefOid,mergedAt,mergeCommit'], canonicalWorkspace);
      const identity = inspectWorktreeIdentity(branch, worktree, headSha);
      const remoteBranchSha = inspectRemoteBranch(repository, branch);
      return {
        head_sha: pr.headRefOid,
        merged: pr.mergedAt !== null,
        merge_sha: pr.mergeCommit?.oid,
        worktree_exists: identity.exists,
        worktree_realpath: identity.realpath,
        worktree_head_sha: identity.exists ? headSha : null,
        local_branch_exists: identity.localBranchSha !== null,
        local_branch_sha: identity.localBranchSha,
        remote_branch_exists: remoteBranchSha !== null,
        remote_branch_sha: remoteBranchSha,
        tracked_conflicts: identity.tracked,
        untracked_conflicts: identity.untracked,
      };
    },
    async cleanup({ repository, head_sha: headSha, branch, worktree, expected_local_sha: expectedLocalSha, expected_remote_sha: expectedRemoteSha, expected_worktree_realpath: expectedWorktreeRealpath, tracked_baseline: trackedBaseline, untracked_baseline: untrackedBaseline }) {
      if (headSha !== expectedLocalSha) fail('ERR_STALE_HEAD', 'cleanup local ref expectation differs from the reviewed head');
      const identity = inspectWorktreeIdentity(branch, worktree, expectedLocalSha);
      if (identity.realpath !== expectedWorktreeRealpath) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup worktree realpath changed after inspection');
      if (JSON.stringify(identity.tracked) !== JSON.stringify(trackedBaseline) || JSON.stringify(identity.untracked) !== JSON.stringify(untrackedBaseline)) {
        if (identity.tracked.length > 0 || identity.untracked.length > 0) return { blocked: true, tracked_conflicts: identity.tracked, untracked_conflicts: identity.untracked };
        fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup dirty baseline changed after inspection');
      }
      if (identity.tracked.length > 0 || identity.untracked.length > 0) return { blocked: true, tracked_conflicts: identity.tracked, untracked_conflicts: identity.untracked };
      const remoteBeforeDelete = inspectRemoteBranch(repository, branch);
      if (remoteBeforeDelete !== expectedRemoteSha) fail('ERR_STALE_HEAD', 'remote branch changed before lease deletion');
      if (identity.exists) {
        try {
          command('git', ['worktree', 'remove', identity.path], canonicalWorkspace);
        } catch (cause) {
          if (!existsSync(identity.path)) throw cause;
          const raced = worktreeStatus(identity.path);
          if (raced.tracked.length > 0 || raced.untracked.length > 0) return { blocked: true, tracked_conflicts: raced.tracked, untracked_conflicts: raced.untracked };
          fail('ERR_SIDE_EFFECT_PRECONDITION', 'guarded worktree removal failed', { cause });
        }
      }
      const ref = `refs/heads/${branch}`;
      const local = readLocalRef(ref);
      if (local !== null) {
        if (local !== expectedLocalSha) fail('ERR_STALE_HEAD', 'local branch changed before CAS deletion');
        try {
          command('git', ['update-ref', '-d', ref, expectedLocalSha], canonicalWorkspace);
        } catch (cause) {
          if (readLocalRef(ref) !== expectedLocalSha) fail('ERR_STALE_HEAD', 'local branch changed during CAS deletion', { cause });
          fail('ERR_SIDE_EFFECT_PRECONDITION', 'CAS-bound local branch deletion failed', { cause });
        }
      }
      if (expectedRemoteSha !== null) {
        try {
          command('git', ['push', `--force-with-lease=${ref}:${expectedRemoteSha}`, 'origin', `:${ref}`], canonicalWorkspace);
        } catch (cause) {
          const remoteAfterFailure = inspectRemoteBranch(repository, branch);
          if (remoteAfterFailure !== null && remoteAfterFailure !== expectedRemoteSha) fail('ERR_STALE_HEAD', 'remote branch advanced during lease deletion', { cause });
          if (remoteAfterFailure !== null) fail('ERR_SIDE_EFFECT_PRECONDITION', 'lease-bound remote branch deletion failed', { cause });
        }
      }
      const finalIdentity = inspectWorktreeIdentity(branch, worktree, expectedLocalSha);
      const remoteBranchSha = inspectRemoteBranch(repository, branch);
      if (remoteBranchSha !== null && remoteBranchSha !== expectedRemoteSha) fail('ERR_STALE_HEAD', 'remote branch advanced during cleanup');
      const complete = !finalIdentity.exists && finalIdentity.localBranchSha === null && remoteBranchSha === null;
      return { complete, worktree_removed: complete, local_branch_deleted: complete, remote_branch_deleted: complete, remote_branch_sha: remoteBranchSha };
    },
    async inspectRootSync({ repository, base_branch: baseBranch }) {
      return inspectRootIdentity(repository, baseBranch);
    },
    async rootSync({ repository, base_branch: baseBranch, expected_local_sha: expectedLocalSha, expected_head_sha: expectedHeadSha }) {
      const beforeFetch = inspectRootIdentity(repository, baseBranch);
      if (beforeFetch.dirty || beforeFetch.head_sha !== expectedLocalSha || !beforeFetch.fast_forward) fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync local baseline changed before fetch');
      if (beforeFetch.remote_head_sha !== expectedHeadSha) fail('ERR_STALE_HEAD', 'remote base changed before root sync');
      command('git', ['fetch', 'origin', `refs/heads/${baseBranch}`], canonicalWorkspace);
      const fetched = command('git', ['rev-parse', 'FETCH_HEAD'], canonicalWorkspace);
      if (fetched !== expectedHeadSha) fail('ERR_STALE_HEAD', 'fetched base differs from inspected remote head');
      const beforeMerge = inspectRootIdentity(repository, baseBranch);
      if (beforeMerge.dirty || beforeMerge.head_sha !== expectedLocalSha || !beforeMerge.fast_forward) fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync local baseline changed before merge');
      if (beforeMerge.remote_head_sha !== expectedHeadSha) fail('ERR_STALE_HEAD', 'remote base changed before merge');
      command('git', ['merge', '--ff-only', expectedHeadSha], canonicalWorkspace);
      return { head_sha: command('git', ['rev-parse', 'HEAD'], canonicalWorkspace) };
    },
  };
  return effects;
}

function parseCli(argv) {
  const [operation, laneId, itemOrFlag, ...rest] = argv;
  if (!OPERATIONS.includes(operation)) fail('ERR_INVALID_SCHEMA', 'operation must be merge, cleanup, or root-sync');
  const itemId = operation === 'root-sync' ? undefined : itemOrFlag;
  const flags = operation === 'root-sync' ? [itemOrFlag, ...rest] : rest;
  if (flags.length !== 4 || flags[0] !== '--expected-revision' || flags[2] !== '--authority-receipt') fail('ERR_INVALID_SCHEMA', 'side-effect arguments are incomplete');
  return validateRequest({ operation, lane_id: laneId, ...(itemId ? { item_id: itemId } : {}), expected_revision: Number(flags[1]), authority_receipt_id: flags[3] });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runWorkflowSideEffect(parseCli(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    if (error instanceof LaneLedgerError) {
      process.stderr.write(`${error.code}: ${error.message}\n`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
