// allow: SIZE_OK - The canonical replay state machine is intentionally kept in one executable module.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  constants,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  readFileSync,
  renameSync,
  rmdirSync,
  writeFileSync,
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  linkSync,
  realpathSync,
  unlinkSync,
} from 'node:fs';
import { hostname, platform } from 'node:os';
import { basename, isAbsolute, join, resolve, win32 } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { isPositiveSafeInteger, parseIssueBranch, parsePositiveSafeInteger } from './issue-branch.mjs';

const SKILL_PATH = new URL('../../.opencode/skills/ilokesto-workflow-governance/SKILL.md', import.meta.url);
const PR_EVENTS = new Set([
  'pr.opened', 'pr.updated', 'review.started', 'review.completed',
  'evidence.invalidated', 'fix_back.started', 'merge.completed', 'cleanup.started',
  'cleanup.completed', 'cleanup.skipped', 'cleanup.blocked',
]);
const GLOBAL_EVENTS = new Set([
  'lane.created', 'workflow.started', 'authority.granted',
  'root_sync.completed', 'root_sync.skipped', 'root_sync.blocked',
  'workflow.completed', 'workflow.blocked',
]);
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,126}[a-z0-9])?$/u;
const LANE_ID_PATTERN = /^lane-[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u;
const PRODUCER_BY_EVENT = new Map();
const CANONICAL_EVENTS = new Set();
const FORBIDDEN_KEYS = /(?:password|passwd|token|secret|credential|environment|env_value|prompt|transcript|session_id|runtime_session|attempt_dir|goal_prefix|home_path)/iu;
const PATH_KEYS = /(?:^|_)(?:path|paths|cwd|artifact|artifacts|worktree|changed_files|tracked_baseline|untracked_baseline|tracked_conflicts|untracked_conflicts)$/u;
const FORBIDDEN_HOME_PATH = /(?:^|[\s"'(=])(?:\/Users\/[^/\s]+|\/home\/[^/\s]+|\/root(?:\/|\b)|[A-Za-z]:\\Users\\[^\\\s]+)(?:[/\\]|\b)/u;
const FORBIDDEN_DURABLE_VALUES = [
  /\b(?:ses|session)[_-][A-Za-z0-9][A-Za-z0-9_-]{7,}\b/u,
  /(?:^|[\s;,])(?:[A-Z][A-Z0-9_]{1,63})\s*=\s*[^\s;,]+/u,
  /\bauthorization\s*:\s*(?:bearer|basic)\s+\S+/iu,
  /\b(?:gh[pousr]_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|sk-[A-Za-z0-9_-]{8,}|AKIA[A-Z0-9]{16})\b/u,
  /(?:^|[\s"'`])(?:prompt|transcript)\s*:/iu,
  /(?:^|[\s"'`])(?:system|user|assistant)\s*:/iu,
];
const VERIFICATION_CREDENTIAL_PATTERNS = [
  /^\s*(?:[A-Za-z_][A-Za-z0-9_]*\s*=\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s;|&]+)\s+)+/u,
  /(?:^|\s)(?:--user|--proxy-user|--password|--token|--secret|--credential|--auth|--oauth2-bearer)(?=\s|=|$)/iu,
  /^\s*(?:\S*\/)?curl\b[\s\S]*\s-u(?:\S+|\s+)/iu,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@/iu,
  /(?:^|[\s;&|])(?:export\s+)?(?:[a-z][a-z0-9]*_)*(?:password|passwd|token|secret|credential|auth|api_key)(?:_[a-z0-9]+)*\s*=/iu,
  /\$(?:\{)?(?:[a-z][a-z0-9]*_)*(?:password|passwd|token|secret|credential|auth|api_key)(?:_[a-z0-9]+)*(?:\})?/iu,
  /(?:\$\([^)]*|`[^`]*)(?:\bpassword\b|\bpasswd\b|\btoken\b|\bsecret\b|\bcredential\b|\bauth\b|\bapi[_ -]?key\b)/iu,
];
const RECOVERY_REASON_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,_:/()'-]{0,255}$/u;
const CREDENTIAL_VALUE_PATTERN = /(?:^|[\s,;])(?:password|passwd|token|secret|credential|api[ _-]?key|auth|authorization)\s*(?::|=|\bis\b)\s*\S+/iu;
const TEST_STORE_HOOKS = new WeakMap();
const PENDING_DURABILITY = new WeakMap();
const REPLAY_CAPABILITY = Symbol('replay');
const AUTHORIZE_CAPABILITY = Symbol('authorize');
const SIDE_EFFECT_CAPABILITY = Symbol('side-effect');
const WRAPPER_EVENTS = new Set([
  'merge.completed',
  'cleanup.completed', 'cleanup.skipped', 'cleanup.blocked',
  'root_sync.completed', 'root_sync.skipped', 'root_sync.blocked',
]);

function valuesFromBackticks(line) {
  return [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
}

function parseContractSkill() {
  const skill = readFileSync(SKILL_PATH, 'utf8');
  const states = skill.match(/## Canonical States\n\n([\s\S]*?)\n## Canonical Transition Contract/u)?.[1];
  const primary = states?.match(/The version 1 item states are:\n\n([^\n]+)/u)?.[1];
  const terminal = states?.match(/Stable persisted terminal item states are:\n\n([^\n]+)/u)?.[1];
  const workflow = states?.match(/Workflow states are exactly ([^\.]+)\./u)?.[1];
  const receipts = skill.match(/Every receipt has this envelope:\n\n([^\n]+)/u)?.[1];
  const errors = skill.match(/The stable non-persisting operation errors are exactly:\n\n([^\n]+)/u)?.[1];
  const durabilityError = skill.match(/The additional stable operation error is `([^`]+)`;/u)?.[1];
  const table = skill.match(/\| Event \/ outcome \| From \| To \| Sole producer \| Required proof \|\n\| --- \| --- \| --- \| --- \| --- \|\n([\s\S]*?)\n\n/u)?.[1];
  if (!primary || !terminal || !workflow || !receipts || !errors || !durabilityError || !table) {
    throw new Error('Workflow governance SSOT is incomplete');
  }
  const transitions = table.trim().split('\n').map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim().replaceAll('`', '')));
  for (const [eventCell, , , producer] of transitions) {
    for (const declared of eventCell.split(' or ')) {
      const outcome = declared.match(/^(.+): (merge|block|needs-human-check)$/u);
      const event = outcome?.[1] ?? declared;
      CANONICAL_EVENTS.add(event);
      if (!PRODUCER_BY_EVENT.has(event)) PRODUCER_BY_EVENT.set(event, producer);
      if (outcome) PRODUCER_BY_EVENT.set(`${event}:${outcome[2]}`, producer);
    }
  }
  return Object.freeze({
    version: 1,
    itemStates: Object.freeze([...valuesFromBackticks(primary), ...valuesFromBackticks(terminal)]),
    terminalItemStates: Object.freeze(valuesFromBackticks(terminal)),
    workflowStates: Object.freeze(valuesFromBackticks(workflow)),
    receiptFields: Object.freeze(valuesFromBackticks(receipts)),
    operationErrors: Object.freeze([...valuesFromBackticks(errors), durabilityError]),
    transitions: Object.freeze(transitions.map((row) => Object.freeze(row))),
  });
}

export const WORKFLOW_CONTRACT = parseContractSkill();
const ITEM_STATES = new Set(WORKFLOW_CONTRACT.itemStates);
const TERMINAL_ITEMS = new Set(WORKFLOW_CONTRACT.terminalItemStates);
const OPERATION_ERRORS = new Set(WORKFLOW_CONTRACT.operationErrors);
const ALLOWED_EVENTS = CANONICAL_EVENTS;

export class LaneLedgerError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'LaneLedgerError';
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new LaneLedgerError(code, message, options);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertSchema(condition, message) {
  if (!condition) fail('ERR_INVALID_SCHEMA', message);
}

function assertReceipt(condition, message) {
  if (!condition) fail('ERR_INVALID_RECEIPT', message);
}

function assertSha(value, field) {
  assertReceipt(typeof value === 'string' && SHA_PATTERN.test(value), `${field} must be a 40-character lowercase SHA`);
}

function assertDigest(value, field) {
  assertReceipt(typeof value === 'string' && DIGEST_PATTERN.test(value), `${field} must be a 64-character lowercase SHA-256`);
}

function assertExactKeys(value, keys, field) {
  assertReceipt(isObject(value), `${field} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertReceipt(isDeepStrictEqual(actual, expected), `${field} has missing or unknown fields`);
}

function assertId(value, field) {
  assertReceipt(typeof value === 'string' && ID_PATTERN.test(value), `${field} is invalid`);
}

function assertPositiveInteger(value, field) {
  assertReceipt(isPositiveSafeInteger(value), `${field} must be a positive safe integer`);
}

function assertTimestamp(value, field) {
  assertReceipt(typeof value === 'string' && Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d\d:\d\d)$/u.test(value), `${field} must be timezone-aware ISO-8601`);
}

function assertString(value, field, maximum = 256) {
  assertReceipt(typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\u0000\r\n]/u.test(value), `${field} must be a bounded non-empty string`);
}

function assertStringArray(value, field, { minimum = 0, unique = true } = {}) {
  assertReceipt(Array.isArray(value) && value.length >= minimum, `${field} must be an array`);
  value.forEach((entry, index) => assertString(entry, `${field}[${String(index)}]`));
  if (unique) assertReceipt(new Set(value).size === value.length, `${field} must not contain duplicates`);
}

function assertRelativePath(value, field) {
  validateRelativePath(value, field);
  assertReceipt(value === '.' || (!value.includes('\\') && !value.startsWith('./') && !value.endsWith('/')), `${field} must be a normalized cross-platform repository-relative path`);
}

function assertRelativePathArray(value, field) {
  assertReceipt(Array.isArray(value), `${field} must be an array`);
  value.forEach((path, index) => assertRelativePath(path, `${field}[${String(index)}]`));
  assertReceipt(new Set(value).size === value.length, `${field} must not contain duplicates`);
}

function assertIssueUrl(value, issueNumber, field) {
  assertReceipt(typeof value === 'string' && new RegExp(`^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/${String(issueNumber)}$`, 'u').test(value), `${field} must be a canonical GitHub issue URL`);
}

function assertBranch(value, field, issueNumber) {
  assertReceipt(parseIssueBranch(value, issueNumber) !== null, `${field} is invalid or not bound to the issue`);
}

function issueNumberFromItemId(itemId) {
  const issueNumber = typeof itemId === 'string' && itemId.startsWith('issue-')
    ? parsePositiveSafeInteger(itemId.slice('issue-'.length))
    : null;
  assertReceipt(issueNumber !== null, 'item_id must bind a positive safe issue number');
  return issueNumber;
}

function assertBlockerSignatures(value, field, minimum = 0) {
  assertStringArray(value, field, { minimum });
  value.forEach((signature, index) => assertReceipt(/^[a-z0-9][a-z0-9._:/-]{2,255}$/u.test(signature), `${field}[${String(index)}] is not stable`));
}

function assertEvidenceReference(value, field) {
  assertExactKeys(value, ['receipt_id', 'evidence_sha256', 'artifact_basename'], field);
  assertId(value.receipt_id, `${field}.receipt_id`);
  assertDigest(value.evidence_sha256, `${field}.evidence_sha256`);
  assertString(value.artifact_basename, `${field}.artifact_basename`);
  assertRelativePath(value.artifact_basename, `${field}.artifact_basename`);
  assertReceipt(basename(value.artifact_basename) === value.artifact_basename, `${field}.artifact_basename must be a session-free basename`);
}

function assertVerificationCommand(value, field) {
  assertString(value, field, 1024);
  if (VERIFICATION_CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value))) fail('ERR_FORBIDDEN_DATA', `${field} contains credential-bearing command data`);
  assertReceipt(!/(?:^|\s)(?:env|printenv|set)(?:\s|$)/u.test(value), `${field} must not dump the environment`);
}

function assertRecoveryReason(value, field) {
  assertString(value, field);
  if (CREDENTIAL_VALUE_PATTERN.test(value)) fail('ERR_FORBIDDEN_DATA', `${field} contains credential-bearing recovery data`);
  assertReceipt(RECOVERY_REASON_PATTERN.test(value), `${field} must be bounded non-secret prose or a stable reason code`);
}

function assertVerification(value, field) {
  assertExactKeys(value, ['command', 'cwd', 'started_at', 'finished_at', 'exit_code', 'head_sha', 'evidence_sha256', 'artifact_basename'], field);
  assertVerificationCommand(value.command, `${field}.command`);
  assertRelativePath(value.cwd, `${field}.cwd`);
  assertTimestamp(value.started_at, `${field}.started_at`);
  assertTimestamp(value.finished_at, `${field}.finished_at`);
  assertReceipt(Date.parse(value.finished_at) >= Date.parse(value.started_at), `${field}.finished_at must not precede started_at`);
  assertReceipt(Number.isInteger(value.exit_code) && value.exit_code >= 0 && value.exit_code <= 255, `${field}.exit_code is invalid`);
  assertSha(value.head_sha, `${field}.head_sha`);
  assertDigest(value.evidence_sha256, `${field}.evidence_sha256`);
  assertString(value.artifact_basename, `${field}.artifact_basename`);
  assertRelativePath(value.artifact_basename, `${field}.artifact_basename`);
  assertReceipt(basename(value.artifact_basename) === value.artifact_basename, `${field}.artifact_basename must be a session-free basename`);
}

function assertChecks(value, field, headSha, requirePass) {
  assertReceipt(Array.isArray(value) && value.length > 0, `${field} must be a non-empty array`);
  const identities = new Set();
  const runIds = new Set();
  value.forEach((check, index) => {
    const checkField = `${field}[${String(index)}]`;
    assertExactKeys(check, ['name', 'run_id', 'status', 'head_sha'], checkField);
    assertString(check.name, `${checkField}.name`);
    assertPositiveInteger(check.run_id, `${checkField}.run_id`);
    assertReceipt(['PASS', 'FAIL', 'PENDING'].includes(check.status), `${checkField}.status is invalid`);
    if (requirePass) assertReceipt(check.status === 'PASS', `${checkField}.status must be PASS`);
    assertSha(check.head_sha, `${checkField}.head_sha`);
    assertReceipt(check.head_sha === headSha, `${checkField}.head_sha is stale`);
    const identity = `${check.name}:${String(check.run_id)}`;
    assertReceipt(!identities.has(identity), `${field} contains duplicate identities`);
    assertReceipt(!runIds.has(check.run_id), `${field} contains duplicate run IDs`);
    identities.add(identity);
    runIds.add(check.run_id);
  });
}

function normalizedCheckIdentities(checks) {
  return checks
    .map(({ name, run_id: runId, head_sha: headSha }) => ({ name, run_id: runId, head_sha: headSha }))
    .sort((left, right) => `${left.name}:${String(left.run_id)}:${left.head_sha}`.localeCompare(`${right.name}:${String(right.run_id)}:${right.head_sha}`));
}

function assertReviewers(value, field, { outcome, docsReleaseRequired }) {
  const reviewerRoles = docsReleaseRequired
    ? ['contract', 'code', 'verification', 'docs_release']
    : ['contract', 'code', 'verification'];
  assertExactKeys(value, reviewerRoles, field);
  const statuses = [];
  for (const name of reviewerRoles) {
    const result = value[name];
    const resultField = `${field}.${name}`;
    assertExactKeys(result, ['status', 'receipt_id', 'evidence_sha256', 'artifact_basename'], resultField);
    assertReceipt(['PASS', 'BLOCK', 'NEEDS_HUMAN_CHECK'].includes(result.status), `${resultField}.status is invalid`);
    assertId(result.receipt_id, `${resultField}.receipt_id`);
    assertDigest(result.evidence_sha256, `${resultField}.evidence_sha256`);
    assertString(result.artifact_basename, `${resultField}.artifact_basename`);
    assertRelativePath(result.artifact_basename, `${resultField}.artifact_basename`);
    assertReceipt(basename(result.artifact_basename) === result.artifact_basename, `${resultField}.artifact_basename must be a basename`);
    statuses.push(result.status);
  }
  assertReceipt(new Set(reviewerRoles.map((name) => value[name].receipt_id)).size === reviewerRoles.length, `${field} receipt identities must be unique`);
  if (outcome === 'merge') assertReceipt(statuses.every((status) => status === 'PASS'), 'merge requires all reviewer results to PASS');
  if (outcome === 'block') assertReceipt(statuses.includes('BLOCK'), 'block requires a blocking reviewer result');
  if (outcome === 'needs-human-check') assertReceipt(!statuses.includes('BLOCK') && statuses.includes('NEEDS_HUMAN_CHECK'), 'needs-human-check requires a non-fixable reviewer result without a blocking reviewer result');
}

function assertIssueBinding(payload, field = 'payload') {
  assertPositiveInteger(payload.issue_number, `${field}.issue_number`);
  assertIssueUrl(payload.issue_url, payload.issue_number, `${field}.issue_url`);
}

function assertWorktreeBinding(payload, field = 'payload', issueNumber = payload.issue_number) {
  assertBranch(payload.branch, `${field}.branch`, issueNumber);
  assertRelativePath(payload.worktree, `${field}.worktree`);
  assertReceipt(payload.worktree === `.worktrees/${payload.branch}`, `${field}.worktree must bind branch`);
}

const PAYLOAD_KEYS = new Map([
  ['lane.created', ['source_selection_handoff_id', 'items']],
  ['workflow.started', []],
  ['item.dispatched', ['base_sha', 'required_merge_shas', 'base_contains_merge_shas']],
  ['worker.started', ['issue_number', 'issue_url', 'branch', 'worktree']],
  ['worker.completed', ['issue_number', 'issue_url', 'branch', 'worktree', 'committed_head_sha', 'changed_files', 'verification', 'changeset_decision', 'remaining_blockers']],
  ['pr.opened', ['issue_number', 'issue_url', 'branch', 'worktree', 'committed_head_sha']],
  ['pr.updated', ['issue_number', 'issue_url', 'branch', 'worktree', 'committed_head_sha']],
  ['review.started', ['issue_number', 'issue_url', 'branch', 'worktree', 'checks']],
  ['review.completed', ['outcome', 'reviewed_head_sha', 'docs_release_required', 'reviewers', 'checks', 'blocker_signatures', 'fix_back_eligible', 'remaining_fix_back_attempts', 'non_fixable_evidence']],
  ['evidence.invalidated', ['previous_head_sha', 'new_head_sha', 'superseded_review_receipt_ids', 'superseded_check_run_ids']],
  ['fix_back.started', ['issue_number', 'issue_url', 'branch', 'worktree', 'blocker_signatures', 'review_receipt_id']],
  ['merge.completed', ['issue_number', 'authority_receipt_id', 'review_receipt_id', 'checks', 'merge_sha', 'method']],
  ['cleanup.started', ['issue_number', 'authority_receipt_id', 'merge_sha', 'branch', 'worktree', 'tracked_baseline', 'untracked_baseline']],
  ['cleanup.completed', ['authority_receipt_id', 'branch', 'worktree', 'worktree_removed', 'local_branch_deleted', 'remote_branch_deleted']],
  ['cleanup.skipped', ['authority_receipt_id', 'branch', 'worktree', 'reason']],
  ['cleanup.blocked', ['authority_receipt_id', 'branch', 'worktree', 'tracked_conflicts', 'untracked_conflicts']],
  ['release_handoff.created', ['merged_shas', 'package', 'changeset', 'target_dist_tag', 'required_external_step']],
  ['authority.granted', ['repository', 'lane_id', 'issues', 'operations', 'squash_method', 'approved_at']],
  ['root_sync.completed', ['authority_receipt_id', 'head_sha', 'method']],
  ['root_sync.skipped', ['authority_receipt_id', 'reason']],
  ['root_sync.blocked', ['authority_receipt_id', 'reason', 'evidence']],
  ['item.blocked', ['error_state', 'error_code', 'evidence']],
  ['workflow.completed', ['root_sync_receipt_id']],
  ['workflow.blocked', ['terminal_item_ids', 'no_runnable_recovery', 'recovery_evidence']],
]);

export function canonicalPayloadEvents() {
  return new Set(PAYLOAD_KEYS.keys());
}

function validatePayload(receipt) {
  const keys = PAYLOAD_KEYS.get(receipt.event);
  assertReceipt(keys !== undefined, `event payload schema is missing: ${receipt.event}`);
  if (receipt.event === 'release_handoff.created' && (receipt.payload.authorizes_release === true || receipt.payload.authorizes_publish === true || receipt.payload.authorizes_workflow_dispatch === true)) {
    fail('ERR_AUTHORITY_MISMATCH', 'release handoff cannot authorize release actions');
  }
  assertExactKeys(receipt.payload, keys, `${receipt.event}.payload`);
  const payload = receipt.payload;
  switch (receipt.event) {
    case 'lane.created':
      assertId(payload.source_selection_handoff_id, 'payload.source_selection_handoff_id');
      assertReceipt(Array.isArray(payload.items) && payload.items.length > 0, 'payload.items must be non-empty');
      payload.items.forEach((item, index) => {
        const field = `payload.items[${String(index)}]`;
        assertExactKeys(item, ['item_id', 'issue_number', 'issue_url', 'hard_dependencies', 'ordering_dependencies'], field);
        assertId(item.item_id, `${field}.item_id`);
        assertIssueBinding(item, field);
        assertReceipt(item.item_id === `issue-${String(item.issue_number)}`, `${field}.item_id must bind issue_number`);
        assertReceipt(item.issue_url.startsWith(`https://github.com/${receipt.repository}/issues/`), `${field}.issue_url must bind repository`);
        assertStringArray(item.hard_dependencies, `${field}.hard_dependencies`);
        assertStringArray(item.ordering_dependencies, `${field}.ordering_dependencies`);
      });
      assertReceipt(new Set(payload.items.map((item) => item.issue_number)).size === payload.items.length, 'payload.items issue numbers must be unique');
      assertReceipt(new Set(payload.items.map((item) => item.issue_url)).size === payload.items.length, 'payload.items issue URLs must be unique');
      break;
    case 'workflow.started': break;
    case 'item.dispatched':
      assertSha(payload.base_sha, 'payload.base_sha');
      assertReceipt(Array.isArray(payload.required_merge_shas), 'payload.required_merge_shas must be an array');
      payload.required_merge_shas.forEach((sha, index) => assertSha(sha, `payload.required_merge_shas[${String(index)}]`));
      assertReceipt(typeof payload.base_contains_merge_shas === 'boolean', 'payload.base_contains_merge_shas must be boolean');
      break;
    case 'worker.started':
      assertIssueBinding(payload); assertWorktreeBinding(payload); break;
    case 'worker.completed':
      assertIssueBinding(payload); assertWorktreeBinding(payload);
      assertSha(payload.committed_head_sha, 'payload.committed_head_sha');
      assertReceipt(Array.isArray(payload.changed_files) && payload.changed_files.length > 0, 'payload.changed_files must be non-empty');
      payload.changed_files.forEach((path, index) => assertRelativePath(path, `payload.changed_files[${String(index)}]`));
      assertReceipt(Array.isArray(payload.verification) && payload.verification.length > 0, 'payload.verification must be structured command results');
      payload.verification.forEach((result, index) => { assertVerification(result, `payload.verification[${String(index)}]`); assertReceipt(result.head_sha === payload.committed_head_sha, 'verification head SHA differs from committed head'); });
      assertReceipt(['added', 'not-required'].includes(payload.changeset_decision), 'payload.changeset_decision is invalid');
      assertBlockerSignatures(payload.remaining_blockers, 'payload.remaining_blockers');
      break;
    case 'pr.opened':
    case 'pr.updated':
      assertIssueBinding(payload); assertWorktreeBinding(payload); assertSha(payload.committed_head_sha, 'payload.committed_head_sha');
      assertReceipt(payload.committed_head_sha === receipt.head_sha, 'PR payload head differs from envelope head');
      break;
    case 'review.started':
      assertIssueBinding(payload); assertWorktreeBinding(payload); assertChecks(payload.checks, 'payload.checks', receipt.head_sha, false); break;
    case 'review.completed': {
      assertReceipt(['merge', 'block', 'needs-human-check'].includes(payload.outcome), 'review outcome is invalid');
      assertSha(payload.reviewed_head_sha, 'payload.reviewed_head_sha');
      if (payload.reviewed_head_sha !== receipt.head_sha) fail('ERR_STALE_HEAD', 'reviewed head SHA is stale');
      assertReceipt(typeof payload.docs_release_required === 'boolean', 'payload.docs_release_required must be boolean');
      assertReviewers(payload.reviewers, 'payload.reviewers', { outcome: payload.outcome, docsReleaseRequired: payload.docs_release_required });
      assertChecks(payload.checks, 'payload.checks', receipt.head_sha, payload.outcome === 'merge');
      assertBlockerSignatures(payload.blocker_signatures, 'payload.blocker_signatures', payload.outcome === 'block' ? 1 : 0);
      assertReceipt(typeof payload.fix_back_eligible === 'boolean', 'payload.fix_back_eligible must be boolean');
      assertReceipt(Number.isInteger(payload.remaining_fix_back_attempts) && payload.remaining_fix_back_attempts >= 0 && payload.remaining_fix_back_attempts <= 3, 'payload.remaining_fix_back_attempts is invalid');
      assertReceipt(Array.isArray(payload.non_fixable_evidence), 'payload.non_fixable_evidence must be an array');
      payload.non_fixable_evidence.forEach((evidence, index) => assertEvidenceReference(evidence, `payload.non_fixable_evidence[${String(index)}]`));
      if (payload.outcome === 'merge') assertReceipt(!payload.fix_back_eligible && payload.blocker_signatures.length === 0 && payload.non_fixable_evidence.length === 0, 'merge payload cannot carry recovery claims');
      if (payload.outcome === 'block') assertReceipt(payload.fix_back_eligible && payload.remaining_fix_back_attempts > 0 && payload.non_fixable_evidence.length === 0, 'block payload must be fix-back eligible');
      if (payload.outcome === 'needs-human-check') assertReceipt(!payload.fix_back_eligible && payload.remaining_fix_back_attempts === 0 && payload.non_fixable_evidence.length > 0, 'needs-human-check requires non-fixable evidence');
      break;
    }
    case 'evidence.invalidated':
      assertSha(payload.previous_head_sha, 'payload.previous_head_sha'); assertSha(payload.new_head_sha, 'payload.new_head_sha');
      assertReceipt(payload.previous_head_sha !== payload.new_head_sha && payload.new_head_sha === receipt.head_sha, 'evidence invalidation head binding is invalid');
      assertStringArray(payload.superseded_review_receipt_ids, 'payload.superseded_review_receipt_ids');
      assertReceipt(Array.isArray(payload.superseded_check_run_ids) && payload.superseded_check_run_ids.every((id) => Number.isInteger(id) && id > 0) && new Set(payload.superseded_check_run_ids).size === payload.superseded_check_run_ids.length, 'payload.superseded_check_run_ids is invalid');
      break;
    case 'fix_back.started':
      assertIssueBinding(payload); assertWorktreeBinding(payload); assertBlockerSignatures(payload.blocker_signatures, 'payload.blocker_signatures', 1); assertId(payload.review_receipt_id, 'payload.review_receipt_id'); break;
    case 'merge.completed':
      assertPositiveInteger(payload.issue_number, 'payload.issue_number'); assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertId(payload.review_receipt_id, 'payload.review_receipt_id'); assertChecks(payload.checks, 'payload.checks', receipt.head_sha, true); assertSha(payload.merge_sha, 'payload.merge_sha'); assertReceipt(payload.method === 'squash', 'payload.method must be squash'); break;
    case 'cleanup.started':
      assertPositiveInteger(payload.issue_number, 'payload.issue_number'); assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertSha(payload.merge_sha, 'payload.merge_sha'); assertWorktreeBinding(payload); assertRelativePathArray(payload.tracked_baseline, 'payload.tracked_baseline'); assertRelativePathArray(payload.untracked_baseline, 'payload.untracked_baseline'); break;
    case 'cleanup.completed':
      assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertWorktreeBinding(payload, 'payload', issueNumberFromItemId(receipt.item_id)); ['worktree_removed', 'local_branch_deleted', 'remote_branch_deleted'].forEach((field) => assertReceipt(typeof payload[field] === 'boolean', `payload.${field} must be boolean`)); break;
    case 'cleanup.skipped':
      assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertWorktreeBinding(payload, 'payload', issueNumberFromItemId(receipt.item_id)); assertReceipt(['already-removed', 'branch-retained'].includes(payload.reason), 'payload.reason is invalid'); break;
    case 'cleanup.blocked':
      assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertWorktreeBinding(payload, 'payload', issueNumberFromItemId(receipt.item_id)); assertRelativePathArray(payload.tracked_conflicts, 'payload.tracked_conflicts'); assertRelativePathArray(payload.untracked_conflicts, 'payload.untracked_conflicts'); assertReceipt(payload.tracked_conflicts.length + payload.untracked_conflicts.length > 0, 'cleanup block requires conflict evidence'); break;
    case 'release_handoff.created':
      assertReceipt(Array.isArray(payload.merged_shas) && payload.merged_shas.length > 0, 'payload.merged_shas must be non-empty'); payload.merged_shas.forEach((sha, index) => assertSha(sha, `payload.merged_shas[${String(index)}]`));
      assertReceipt(['store', 'state', 'form', 'overlay', 'modal', 'toast', 'fetcher', 'utilinent'].includes(payload.package), 'payload.package is invalid');
      assertReceipt(['included', 'not-required'].includes(payload.changeset), 'payload.changeset is invalid'); assertReceipt(['latest', 'beta'].includes(payload.target_dist_tag), 'payload.target_dist_tag is invalid'); assertReceipt(payload.required_external_step === 'github-actions-release', 'payload.required_external_step is invalid'); break;
    case 'authority.granted':
      assertReceipt(payload.repository === receipt.repository && payload.lane_id === receipt.lane_id, 'authority identity differs from receipt');
      assertReceipt(Array.isArray(payload.operations) && payload.operations.length === 1 && ['merge', 'cleanup', 'root-sync'].includes(payload.operations[0]), 'authority must grant exactly one operation');
      assertReceipt(Array.isArray(payload.issues), 'payload.issues must be an array'); payload.issues.forEach((issue, index) => assertPositiveInteger(issue, `payload.issues[${String(index)}]`));
      assertReceipt(payload.operations[0] === 'root-sync' ? payload.issues.length === 0 : payload.issues.length === 1, 'authority issue scope does not match its operation');
      assertReceipt(payload.squash_method === 'squash', 'authority must bind squash method'); assertTimestamp(payload.approved_at, 'payload.approved_at'); assertReceipt(Date.parse(payload.approved_at) <= Date.parse(receipt.created_at), 'payload.approved_at cannot follow receipt creation'); break;
    case 'root_sync.completed':
      assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertSha(payload.head_sha, 'payload.head_sha'); assertReceipt(payload.method === 'ff-only', 'payload.method must be ff-only'); break;
    case 'root_sync.skipped':
      assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertReceipt(['already-current', 'no-root-change'].includes(payload.reason), 'payload.reason is invalid'); break;
    case 'root_sync.blocked':
      assertId(payload.authority_receipt_id, 'payload.authority_receipt_id'); assertReceipt(['dirty-root', 'non-ff', 'external-identity-mismatch'].includes(payload.reason), 'payload.reason is invalid'); assertEvidenceReference(payload.evidence, 'payload.evidence'); break;
    case 'item.blocked':
      assertReceipt(TERMINAL_ITEMS.has(payload.error_state), 'item.blocked error_state is invalid'); assertReceipt(OPERATION_ERRORS.has(payload.error_code) && payload.error_code !== 'ERR_DURABILITY_UNCERTAIN', 'item.blocked error_code is invalid'); assertReceipt(Array.isArray(payload.evidence) && payload.evidence.length > 0, 'payload.evidence must be non-empty'); payload.evidence.forEach((entry, index) => assertEvidenceReference(entry, `payload.evidence[${String(index)}]`)); break;
    case 'workflow.completed': assertId(payload.root_sync_receipt_id, 'payload.root_sync_receipt_id'); break;
    case 'workflow.blocked':
      assertStringArray(payload.terminal_item_ids, 'payload.terminal_item_ids', { minimum: 1 }); assertReceipt(payload.no_runnable_recovery === true, 'workflow.blocked must prove no runnable recovery'); assertReceipt(Array.isArray(payload.recovery_evidence) && payload.recovery_evidence.length > 0, 'payload.recovery_evidence must be non-empty');
      payload.recovery_evidence.forEach((entry, index) => { const field = `payload.recovery_evidence[${String(index)}]`; assertExactKeys(entry, ['item_id', 'error_state', 'reason'], field); assertId(entry.item_id, `${field}.item_id`); assertReceipt(TERMINAL_ITEMS.has(entry.error_state), `${field}.error_state is invalid`); assertRecoveryReason(entry.reason, `${field}.reason`); }); break;
    default: fail('ERR_INVALID_RECEIPT', `event payload schema is missing: ${receipt.event}`);
  }
}

function deepFreeze(value) {
  if (!isObject(value) && !Array.isArray(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

export function createReceipt(input) {
  const receipt = structuredClone(input);
  validateReceipt(receipt);
  return deepFreeze(receipt);
}

export function validateSourceSelectionHandoff(input) {
  assertReceipt(isObject(input), 'source.selected handoff must be an object');
  assertExactKeys(input, ['version', 'handoff_id', 'event', 'repository', 'created_at', 'issues'], 'source.selected');
  if (input.version !== 1) fail('ERR_UNSUPPORTED_VERSION', 'source.selected version must be 1');
  assertReceipt(input.event === 'source.selected', 'source.selected event is invalid'); assertId(input.handoff_id, 'source.selected.handoff_id');
  assertReceipt(typeof input.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input.repository), 'source.selected.repository is invalid'); assertTimestamp(input.created_at, 'source.selected.created_at');
  assertReceipt(Array.isArray(input.issues) && input.issues.length > 0, 'source.selected.issues must be non-empty');
  const numbers = new Set();
  input.issues.forEach((issue, index) => {
    const field = `source.selected.issues[${String(index)}]`; assertExactKeys(issue, ['issue_number', 'issue_url', 'source', 'approval', 'provenance'], field); assertPositiveInteger(issue.issue_number, `${field}.issue_number`); assertIssueUrl(issue.issue_url, issue.issue_number, `${field}.issue_url`);
    assertReceipt(issue.issue_url.startsWith(`https://github.com/${input.repository}/issues/`), `${field}.issue_url must bind repository`);
    assertReceipt(['registered', 'direct'].includes(issue.source), `${field}.source is invalid`); assertReceipt(issue.approval === 'explicit', `${field}.approval must be explicit`); assertExactKeys(issue.provenance, ['kind', 'reference'], `${field}.provenance`);
    assertReceipt(issue.provenance.kind === (issue.source === 'registered' ? 'search-run' : 'direct-input'), `${field}.provenance.kind does not match source`); assertId(issue.provenance.reference, `${field}.provenance.reference`); assertReceipt(!numbers.has(issue.issue_number), 'source.selected issue numbers must be unique'); numbers.add(issue.issue_number);
  });
  validateDataMinimization(input, 'source.selected');
  return input;
}

export function createSourceSelectionHandoff(input) {
  const handoff = structuredClone(input);
  validateSourceSelectionHandoff(handoff);
  return deepFreeze(handoff);
}

export function createSourceSelectionFromIssueCandidates(input) {
  assertReceipt(isObject(input), 'source candidates must be an object');
  assertExactKeys(input, ['version', 'handoff_id', 'event', 'repository', 'created_at', 'candidates'], 'source.candidates');
  if (input.version !== 1) fail('ERR_UNSUPPORTED_VERSION', 'source candidates version must be 1');
  assertReceipt(input.event === 'source.candidates', 'source candidates event is invalid');
  assertId(input.handoff_id, 'source.candidates.handoff_id');
  assertReceipt(typeof input.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input.repository), 'source.candidates.repository is invalid');
  assertTimestamp(input.created_at, 'source.candidates.created_at');
  assertReceipt(Array.isArray(input.candidates) && input.candidates.length > 0, 'source.candidates.candidates must be non-empty');
  const numbers = new Set();
  const selected = [];
  input.candidates.forEach((candidate, index) => {
    const field = `source.candidates.candidates[${String(index)}]`;
    assertExactKeys(candidate, ['issue_number', 'issue_url', 'disposition', 'approval', 'provenance'], field);
    assertPositiveInteger(candidate.issue_number, `${field}.issue_number`);
    assertIssueUrl(candidate.issue_url, candidate.issue_number, `${field}.issue_url`);
    assertReceipt(candidate.issue_url.startsWith(`https://github.com/${input.repository}/issues/`), `${field}.issue_url must bind repository`);
    assertReceipt(['registered', 'deferred', 'rejected', 'duplicate', 'direct'].includes(candidate.disposition), `${field}.disposition is invalid`);
    assertReceipt(['explicit', 'not-approved'].includes(candidate.approval), `${field}.approval is invalid`);
    assertExactKeys(candidate.provenance, ['kind', 'reference'], `${field}.provenance`);
    const expectedKind = candidate.disposition === 'direct' ? 'direct-input' : 'search-run';
    assertReceipt(candidate.provenance.kind === expectedKind, `${field}.provenance.kind does not match disposition`);
    assertId(candidate.provenance.reference, `${field}.provenance.reference`);
    assertReceipt(!numbers.has(candidate.issue_number), 'source candidate issue numbers must be unique');
    numbers.add(candidate.issue_number);
    if (['registered', 'direct'].includes(candidate.disposition) && candidate.approval === 'explicit') {
      selected.push({
        issue_number: candidate.issue_number,
        issue_url: candidate.issue_url,
        source: candidate.disposition,
        approval: candidate.approval,
        provenance: structuredClone(candidate.provenance),
      });
    }
  });
  return createSourceSelectionHandoff({
    version: input.version,
    handoff_id: input.handoff_id,
    event: 'source.selected',
    repository: input.repository,
    created_at: input.created_at,
    issues: selected,
  });
}

export function validateLaneCreationFromSourceSelection(laneReceipt, sourceHandoff) {
  validateSourceSelectionHandoff(sourceHandoff);
  validateReceipt(laneReceipt);
  assertReceipt(laneReceipt.event === 'lane.created', 'source selection may only create a lane');
  assertReceipt(laneReceipt.repository === sourceHandoff.repository, 'lane repository differs from source selection');
  assertReceipt(laneReceipt.payload.source_selection_handoff_id === sourceHandoff.handoff_id, 'lane source handoff identity differs');
  const laneIssues = laneReceipt.payload.items.map(({ issue_number: issueNumber, issue_url: issueUrl }) => `${String(issueNumber)}:${issueUrl}`).sort();
  const sourceIssues = sourceHandoff.issues.map(({ issue_number: issueNumber, issue_url: issueUrl }) => `${String(issueNumber)}:${issueUrl}`).sort();
  assertReceipt(isDeepStrictEqual(laneIssues, sourceIssues), 'lane issue set differs from source selection');
  return laneReceipt;
}

export function validateLaneId(laneId) {
  if (typeof laneId !== 'string' || !LANE_ID_PATTERN.test(laneId)) {
    fail('ERR_PATH_OUTSIDE_ROOT', 'lane ID is invalid');
  }
  return laneId;
}

function validateRelativePath(value, field) {
  assertReceipt(typeof value === 'string' && value.length > 0, `${field} must be a non-empty relative path`);
  if (isAbsolute(value) || win32.isAbsolute(value) || value.split(/[\\/]/u).includes('..')) {
    fail('ERR_PATH_OUTSIDE_ROOT', `${field} must stay beneath the repository root`);
  }
}

function validateDurableData(value, path, pathValue) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateDurableData(entry, `${path}[${String(index)}]`, pathValue));
    return value;
  }
  if (typeof value === 'string') {
    if ((!pathValue && FORBIDDEN_HOME_PATH.test(value)) || FORBIDDEN_DURABLE_VALUES.some((pattern) => pattern.test(value))) fail('ERR_FORBIDDEN_DATA', `${path} contains forbidden durable data`);
    return value;
  }
  if (!isObject(value)) return value;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.test(key)) fail('ERR_FORBIDDEN_DATA', `${path}.${key} is forbidden durable data`);
    if (PATH_KEYS.test(key)) {
      const paths = Array.isArray(entry) ? entry : [entry];
      for (const candidate of paths) validateRelativePath(candidate, `${path}.${key}`);
      validateDurableData(entry, `${path}.${key}`, true);
      continue;
    }
    if (key === 'artifact_basename') {
      validateRelativePath(entry, `${path}.${key}`);
      if (basename(entry) !== entry) fail('ERR_FORBIDDEN_DATA', `${path}.${key} must be a session-free basename`);
    }
    validateDurableData(entry, `${path}.${key}`, false);
  }
  return value;
}

export function validateDataMinimization(value, path = 'receipt') {
  return validateDurableData(value, path, false);
}

function receiptOutcome(receipt) {
  return receipt.event === 'review.completed' ? receipt.payload.outcome : null;
}

function producerForReceipt(receipt) {
  const outcome = receiptOutcome(receipt);
  if (outcome && PRODUCER_BY_EVENT.has(`${receipt.event}:${outcome}`)) return PRODUCER_BY_EVENT.get(`${receipt.event}:${outcome}`);
  return PRODUCER_BY_EVENT.get(receipt.event);
}

export function validateReceipt(receipt) {
  assertReceipt(isObject(receipt), 'receipt must be an object');
  if (receipt.version !== 1) fail('ERR_UNSUPPORTED_VERSION', 'receipt version must be 1');
  const allowedFields = new Set(PR_EVENTS.has(receipt.event) ? [...WORKFLOW_CONTRACT.receiptFields, 'pr_number', 'head_sha'] : WORKFLOW_CONTRACT.receiptFields);
  assertReceipt(Object.keys(receipt).every((field) => allowedFields.has(field)), 'receipt has unknown envelope fields');
  assertReceipt(WORKFLOW_CONTRACT.receiptFields.every((field) => Object.hasOwn(receipt, field)), 'receipt envelope is incomplete');
  assertReceipt(typeof receipt.receipt_id === 'string' && ID_PATTERN.test(receipt.receipt_id), 'receipt_id is invalid');
  assertReceipt(ALLOWED_EVENTS.has(receipt.event), `event is not canonical: ${String(receipt.event)}`);
  assertReceipt(isObject(receipt.payload), 'payload must be an object');
  validateLaneId(receipt.lane_id);
  assertReceipt(receipt.item_id === null || (typeof receipt.item_id === 'string' && ID_PATTERN.test(receipt.item_id)), 'item_id is invalid');
  assertReceipt(Number.isInteger(receipt.attempt) && receipt.attempt >= 0, 'attempt must be a non-negative integer');
  assertReceipt(receipt.dispatch_id === null || (typeof receipt.dispatch_id === 'string' && ID_PATTERN.test(receipt.dispatch_id)), 'dispatch_id is invalid');
  if (GLOBAL_EVENTS.has(receipt.event)) {
    assertReceipt(receipt.item_id === null && receipt.attempt === 0 && receipt.dispatch_id === null, `${receipt.event} must use global envelope identity`);
  }
  assertReceipt(receipt.producer === producerForReceipt(receipt), `producer does not own ${receipt.event}`);
  assertReceipt(Number.isInteger(receipt.expected_revision) && receipt.expected_revision >= 0, 'expected_revision must be a non-negative integer');
  assertReceipt(typeof receipt.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(receipt.repository), 'repository must be owner/name');
  assertReceipt(typeof receipt.base_branch === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(receipt.base_branch) && !receipt.base_branch.includes('..'), 'base_branch is invalid');
  assertReceipt(typeof receipt.created_at === 'string' && Number.isFinite(Date.parse(receipt.created_at)) && /(?:Z|[+-]\d\d:\d\d)$/u.test(receipt.created_at), 'created_at must be timezone-aware ISO-8601');
  if (PR_EVENTS.has(receipt.event)) {
    assertReceipt(isPositiveSafeInteger(receipt.pr_number), 'pr_number must be a positive safe integer');
    assertSha(receipt.head_sha, 'head_sha');
  }
  if (receipt.event === 'review.completed') {
    assertReceipt(['merge', 'block', 'needs-human-check'].includes(receiptOutcome(receipt)), 'review outcome is invalid');
  }
  validateDataMinimization(receipt);
  validatePayload(receipt);
  return receipt;
}

function itemFor(projection, receipt) {
  const item = receipt.item_id === null ? null : projection.items[receipt.item_id];
  if (!item) fail('ERR_ILLEGAL_TRANSITION', `item is not present: ${String(receipt.item_id)}`);
  return item;
}

function assertIdentity(projection, receipt) {
  if (projection.lane_id !== receipt.lane_id || projection.repository !== receipt.repository || projection.base_branch !== receipt.base_branch) {
    fail('ERR_INVALID_RECEIPT', 'receipt identity differs from the lane identity');
  }
  if (receipt.expected_revision !== projection.revision) fail('ERR_REVISION_CONFLICT', 'receipt expected_revision is stale');
}

function assertItemState(item, allowed, event) {
  if (!allowed.includes(item.state)) fail('ERR_ILLEGAL_TRANSITION', `${event} is illegal from ${item.state}`);
}

function assertCurrentAttemptDispatch(item, receipt) {
  assertReceipt(receipt.attempt === item.attempt && receipt.dispatch_id === item.dispatch_id, `${receipt.event} attempt or dispatch identity is stale`);
}

function assertPrIdentity(projection, item, receipt) {
  for (const [itemId, candidate] of Object.entries(projection.items)) {
    if (itemId !== receipt.item_id && candidate.pr_number === receipt.pr_number) fail('ERR_INVALID_RECEIPT', 'PR number is already mapped to another item');
  }
  if (item.pr_number !== undefined && item.pr_number !== receipt.pr_number) fail('ERR_INVALID_RECEIPT', 'PR identity changed');
  if (item.head_sha !== undefined && !['evidence.invalidated', 'pr.updated'].includes(receipt.event) && item.head_sha !== receipt.head_sha) fail('ERR_STALE_HEAD', 'receipt head SHA is stale');
}

function assertRootReady(projection) {
  if (!Object.values(projection.items).every((item) => item.state === 'done' || item.state === 'release-handoff')) {
    fail('ERR_SIDE_EFFECT_PRECONDITION', 'root sync requires every item to be done or release-handoff');
  }
}

function authorityConsumptionKey(operation, issueNumber) {
  return operation === 'root-sync' ? 'root-sync' : `${operation}:${String(issueNumber)}`;
}

function expectedAuthorityKeys(authority) {
  return authority.operations.flatMap((operation) => operation === 'root-sync'
    ? ['root-sync']
    : authority.issues.map((issueNumber) => authorityConsumptionKey(operation, issueNumber)));
}

function assertAuthorityAvailable(projection, receipt, operation, issueNumber) {
  const authority = projection.authority;
  if (!authority || !authority.operations.includes(operation)) fail('ERR_AUTHORITY_MISSING', `${operation} authority is absent`);
  const expected = expectedAuthorityKeys(authority);
  if (new Set(authority.consumed_operations).size !== authority.consumed_operations.length || !authority.consumed_operations.every((key) => expected.includes(key))) fail('ERR_AUTHORITY_MISMATCH', 'authority consumption keys are invalid');
  const key = authorityConsumptionKey(operation, issueNumber);
  if (operation !== 'root-sync' && !authority.issues.includes(issueNumber)) fail('ERR_AUTHORITY_MISMATCH', `${operation} issue is not authorized`);
  if (authority.consumed_operations.includes(key)) fail('ERR_AUTHORITY_CONSUMED', `${operation} authority is consumed`);
  if (receipt.payload.authority_receipt_id !== authority.receipt_id) fail('ERR_AUTHORITY_MISMATCH', `${operation} authority differs`);
  return key;
}

export function validateLegalTransition(projection, receipt, options = {}) {
  validateReceipt(receipt);
  if (projection === null) {
    if (receipt.event !== 'lane.created' || receipt.expected_revision !== 0) fail('ERR_ILLEGAL_TRANSITION', 'first receipt must be lane.created at revision 0');
    return receipt;
  }
  assertIdentity(projection, receipt);
  if (receipt.event === 'lane.created') fail('ERR_ILLEGAL_TRANSITION', 'lane.created may only be the first receipt');
  const capability = options.capability;
  if (receipt.event === 'authority.granted' && capability !== AUTHORIZE_CAPABILITY && capability !== REPLAY_CAPABILITY) fail('ERR_ILLEGAL_TRANSITION', 'authority.granted requires the dedicated authorize operation');
  if (WRAPPER_EVENTS.has(receipt.event) && capability !== SIDE_EFFECT_CAPABILITY && capability !== REPLAY_CAPABILITY) fail('ERR_ILLEGAL_TRANSITION', `${receipt.event} requires the dedicated side-effect wrapper`);
  const item = receipt.item_id === null ? null : itemFor(projection, receipt);
  switch (receipt.event) {
    case 'workflow.started':
      if (receipt.item_id !== null || projection.workflow_state !== 'ready') fail('ERR_ILLEGAL_TRANSITION', 'workflow.started requires ready workflow');
      break;
    case 'item.dispatched': {
      assertItemState(item, ['queued'], receipt.event);
      assertReceipt(receipt.attempt === item.attempt, 'item.dispatched attempt identity is stale');
      assertReceipt(receipt.dispatch_id !== null, 'item.dispatched requires dispatch_id');
      const required = item.hard_dependencies.map((id) => projection.items[id]);
      if (!required.every((dependency) => dependency && SHA_PATTERN.test(dependency.merge_sha ?? ''))) {
        fail('ERR_SIDE_EFFECT_PRECONDITION', 'hard dependencies must be merged');
      }
      const mergeShas = required.map((dependency) => dependency.merge_sha).sort();
      const claimed = Array.isArray(receipt.payload.required_merge_shas) ? [...receipt.payload.required_merge_shas].sort() : [];
      if (!isDeepStrictEqual(mergeShas, claimed) || receipt.payload.base_contains_merge_shas !== true) fail('ERR_SIDE_EFFECT_PRECONDITION', 'dependent base does not prove required merge ancestry');
      if (!item.ordering_dependencies.every((id) => isTerminalItemState(projection.items[id]?.state))) fail('ERR_SIDE_EFFECT_PRECONDITION', 'ordering dependencies must be terminal before dispatch');
      assertSha(receipt.payload.base_sha, 'payload.base_sha');
      break;
    }
    case 'worker.started':
      assertItemState(item, ['dispatching'], receipt.event);
      assertReceipt(receipt.dispatch_id !== null, 'worker.started requires dispatch_id');
      assertReceipt(receipt.dispatch_id === item.dispatch_id && receipt.attempt === item.attempt + 1, 'worker.started attempt or dispatch identity is stale');
      assertReceipt(receipt.payload.issue_number === item.issue_number && receipt.payload.issue_url === item.issue_url, 'worker issue differs from item identity');
      for (const [itemId, candidate] of Object.entries(projection.items)) {
        if (itemId !== receipt.item_id && (candidate.branch === receipt.payload.branch || candidate.worktree === receipt.payload.worktree)) fail('ERR_INVALID_RECEIPT', 'worker branch or worktree is already claimed');
      }
      break;
    case 'worker.completed':
      assertItemState(item, ['implementing', 'fix-back'], receipt.event);
      assertReceipt(receipt.dispatch_id === item.dispatch_id && receipt.attempt === item.attempt, 'worker completion attempt or dispatch is unbound');
      assertReceipt(receipt.payload.issue_number === item.issue_number && receipt.payload.issue_url === item.issue_url && receipt.payload.branch === item.branch && receipt.payload.worktree === item.worktree, 'worker completion identity is unbound');
      break;
    case 'pr.opened':
    case 'pr.updated':
      assertItemState(item, ['implementation-complete'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      if (receipt.event === 'pr.opened' && item.pr_number !== undefined) fail('ERR_INVALID_RECEIPT', 'pr.opened cannot replace an existing PR');
      if (receipt.event === 'pr.updated' && item.pr_number === undefined) fail('ERR_INVALID_RECEIPT', 'pr.updated requires an existing PR');
      assertPrIdentity(projection, item, receipt);
      assertReceipt(receipt.payload.issue_number === item.issue_number && receipt.payload.issue_url === item.issue_url && receipt.payload.branch === item.branch && receipt.payload.worktree === item.worktree, 'PR payload identity is unbound');
      if (receipt.head_sha !== item.commit_sha) fail('ERR_STALE_HEAD', 'PR head differs from worker committed head');
      break;
    case 'review.started':
      assertItemState(item, ['pr-open'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      assertPrIdentity(projection, item, receipt);
      assertReceipt(receipt.payload.issue_number === item.issue_number && receipt.payload.issue_url === item.issue_url && receipt.payload.branch === item.branch && receipt.payload.worktree === item.worktree, 'review identity is unbound');
      break;
    case 'review.completed':
      assertItemState(item, ['in-review'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      assertPrIdentity(projection, item, receipt);
      if (!item.pending_review || !isDeepStrictEqual(item.pending_review.checks, normalizedCheckIdentities(receipt.payload.checks))) fail('ERR_STALE_HEAD', 'review check identities differ from review start');
      if (receipt.payload.outcome === 'block' && receipt.payload.remaining_fix_back_attempts !== 4 - item.attempt) fail('ERR_SIDE_EFFECT_PRECONDITION', 'review fix-back budget differs from current attempt');
      break;
    case 'evidence.invalidated':
      assertItemState(item, ['pr-open', 'in-review'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      if (item.head_sha === receipt.head_sha || receipt.payload.previous_head_sha !== item.head_sha) fail('ERR_STALE_HEAD', 'evidence invalidation requires the exact changed head SHA');
      if (!item.pending_review && (receipt.payload.superseded_review_receipt_ids.length !== 0 || receipt.payload.superseded_check_run_ids.length !== 0)) fail('ERR_STALE_HEAD', 'evidence invalidation cannot supersede evidence that does not exist');
      if (item.pending_review && !isDeepStrictEqual(receipt.payload.superseded_review_receipt_ids, [item.pending_review.receipt_id])) fail('ERR_STALE_HEAD', 'evidence invalidation does not exactly supersede the current review receipt');
      if (item.pending_review && !isDeepStrictEqual(new Set(receipt.payload.superseded_check_run_ids), new Set(item.pending_review.checks.map((check) => check.run_id)))) fail('ERR_STALE_HEAD', 'evidence invalidation does not exactly supersede current check identities');
      break;
    case 'fix_back.started':
      assertItemState(item, ['fix-back-pending'], receipt.event);
      if (receipt.dispatch_id !== item.dispatch_id || receipt.attempt !== item.attempt + 1 || receipt.attempt > 4) fail('ERR_SIDE_EFFECT_PRECONDITION', 'fix-back attempt or dispatch is outside the retry budget');
      assertPrIdentity(projection, item, receipt);
      assertReceipt(receipt.payload.issue_number === item.issue_number && receipt.payload.issue_url === item.issue_url && receipt.payload.branch === item.branch && receipt.payload.worktree === item.worktree, 'fix-back identity is unbound');
      assertReceipt(item.review?.receipt_id === receipt.payload.review_receipt_id && isDeepStrictEqual(item.review?.blocker_signatures, receipt.payload.blocker_signatures), 'fix-back blockers are unbound');
      break;
    case 'merge.completed':
      assertItemState(item, ['merge-ready'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      assertPrIdentity(projection, item, receipt);
      assertSha(receipt.payload.merge_sha, 'payload.merge_sha');
      assertAuthorityAvailable(projection, receipt, 'merge', item.issue_number);
      if (receipt.payload.issue_number !== item.issue_number || receipt.payload.review_receipt_id !== item.review?.receipt_id || !isDeepStrictEqual(normalizedCheckIdentities(receipt.payload.checks), normalizedCheckIdentities(item.review?.checks ?? []))) fail('ERR_AUTHORITY_MISMATCH', 'merge item, review, or check identity differs');
      break;
    case 'cleanup.started':
      assertItemState(item, ['merged'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      assertPrIdentity(projection, item, receipt);
      assertAuthorityAvailable(projection, receipt, 'cleanup', item.issue_number);
      if (receipt.payload.issue_number !== item.issue_number || receipt.payload.merge_sha !== item.merge_sha || receipt.payload.branch !== item.branch || receipt.payload.worktree !== item.worktree) fail('ERR_AUTHORITY_MISMATCH', 'cleanup start identity differs');
      break;
    case 'cleanup.completed':
    case 'cleanup.skipped':
      assertItemState(item, ['cleanup-pending'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      assertPrIdentity(projection, item, receipt);
      if (!item.merge_sha) fail('ERR_SIDE_EFFECT_PRECONDITION', 'cleanup requires a completed merge');
      assertAuthorityAvailable(projection, receipt, 'cleanup', item.issue_number);
      if (receipt.payload.branch !== item.branch || receipt.payload.worktree !== item.worktree) fail('ERR_AUTHORITY_MISMATCH', 'cleanup identity differs');
      break;
    case 'cleanup.blocked':
      assertItemState(item, ['cleanup-pending'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      assertPrIdentity(projection, item, receipt);
      assertAuthorityAvailable(projection, receipt, 'cleanup', item.issue_number);
      if (receipt.payload.branch !== item.branch || receipt.payload.worktree !== item.worktree) fail('ERR_AUTHORITY_MISMATCH', 'cleanup block identity differs');
      break;
    case 'release_handoff.created':
      assertItemState(item, ['queued'], receipt.event);
      assertCurrentAttemptDispatch(item, receipt);
      break;
    case 'authority.granted':
      if (projection.authority && expectedAuthorityKeys(projection.authority).some((key) => !projection.authority.consumed_operations.includes(key))) fail('ERR_AUTHORITY_MISMATCH', 'unconsumed authority already exists');
      assertReceipt(receipt.item_id === null && receipt.payload.operations.length === 1, 'authority receipt is malformed');
      assertReceipt(receipt.payload.squash_method === 'squash', 'authority must bind squash method');
      if (receipt.payload.operations[0] === 'root-sync') {
        assertReceipt(receipt.payload.issues.length === 0, 'root-sync authority cannot bind an item issue');
      } else {
        assertReceipt(receipt.payload.issues.length === 1 && Object.values(projection.items).some((candidate) => candidate.issue_number === receipt.payload.issues[0]), 'authority issue is not a lane item');
      }
      break;
    case 'root_sync.completed':
    case 'root_sync.skipped':
      assertRootReady(projection);
      if (projection.root_sync !== 'pending') fail('ERR_ILLEGAL_TRANSITION', 'root sync is already terminal');
      assertAuthorityAvailable(projection, receipt, 'root-sync');
      break;
    case 'root_sync.blocked':
      assertRootReady(projection);
      if (projection.root_sync !== 'pending') fail('ERR_ILLEGAL_TRANSITION', 'root sync is already terminal');
      assertAuthorityAvailable(projection, receipt, 'root-sync');
      break;
    case 'item.blocked':
      if (isTerminalItemState(item.state)) fail('ERR_ILLEGAL_TRANSITION', 'terminal item cannot be blocked again');
      assertCurrentAttemptDispatch(item, receipt);
      break;
    case 'workflow.completed':
      if (projection.workflow_state !== 'running' || projection.root_sync === 'pending' || !Object.values(projection.items).every((candidate) => candidate.state === 'done' || candidate.state === 'release-handoff')) {
        fail('ERR_SIDE_EFFECT_PRECONDITION', 'workflow completion preconditions are not met');
      }
      if (receipt.payload.root_sync_receipt_id !== projection.root_sync_receipt_id) fail('ERR_SIDE_EFFECT_PRECONDITION', 'workflow completion root-sync receipt is stale');
      break;
    case 'workflow.blocked':
      if (projection.workflow_state !== 'running' || !Object.values(projection.items).some((candidate) => TERMINAL_ITEMS.has(candidate.state))) {
        fail('ERR_SIDE_EFFECT_PRECONDITION', 'workflow block requires a terminal error item');
      }
      if (!receipt.payload.terminal_item_ids.every((id) => TERMINAL_ITEMS.has(projection.items[id]?.state)) || new Set(receipt.payload.recovery_evidence.map((entry) => entry.item_id)).size !== receipt.payload.recovery_evidence.length || !isDeepStrictEqual(new Set(receipt.payload.terminal_item_ids), new Set(receipt.payload.recovery_evidence.map((entry) => entry.item_id))) || !receipt.payload.recovery_evidence.every((entry) => projection.items[entry.item_id]?.state === entry.error_state)) fail('ERR_SIDE_EFFECT_PRECONDITION', 'workflow block evidence does not exactly identify terminal item states');
      if (!Object.values(projection.items).every((candidate) => isTerminalItemState(candidate.state))) fail('ERR_SIDE_EFFECT_PRECONDITION', 'workflow block requires every item to be terminal');
      break;
    default:
      fail('ERR_ILLEGAL_TRANSITION', `unsupported canonical event: ${receipt.event}`);
  }
  return receipt;
}

function createProjection(receipt) {
  assertReceipt(receipt.item_id === null, 'lane.created item_id must be null');
  assertReceipt(Array.isArray(receipt.payload.items) && receipt.payload.items.length > 0, 'lane.created requires items');
  const items = {};
  for (const source of receipt.payload.items) {
    assertReceipt(isObject(source) && typeof source.item_id === 'string' && ID_PATTERN.test(source.item_id), 'created item_id is invalid');
    assertReceipt(!Object.hasOwn(items, source.item_id), 'created item IDs must be unique');
    const hard = source.hard_dependencies ?? [];
    const ordering = source.ordering_dependencies ?? [];
    assertReceipt(Array.isArray(hard) && Array.isArray(ordering), 'dependency lists must be arrays');
    items[source.item_id] = { state: 'queued', attempt: 0, dispatch_id: null, issue_number: source.issue_number, issue_url: source.issue_url, hard_dependencies: [...hard], ordering_dependencies: [...ordering] };
  }
  for (const [itemId, item] of Object.entries(items)) {
    for (const dependency of [...item.hard_dependencies, ...item.ordering_dependencies]) {
      assertReceipt(typeof dependency === 'string' && dependency !== itemId && Object.hasOwn(items, dependency), 'dependency references an invalid item');
    }
  }
  const visiting = new Set();
  const visited = new Set();
  for (const start of Object.keys(items)) {
    if (visited.has(start)) continue;
    const pending = [{ itemId: start, exiting: false }];
    while (pending.length > 0) {
      const current = pending.pop();
      if (current.exiting) {
        visiting.delete(current.itemId);
        visited.add(current.itemId);
        continue;
      }
      if (visited.has(current.itemId)) continue;
      assertReceipt(!visiting.has(current.itemId), 'dependency graph must be acyclic');
      visiting.add(current.itemId);
      pending.push({ itemId: current.itemId, exiting: true });
      const dependencies = [...items[current.itemId].hard_dependencies, ...items[current.itemId].ordering_dependencies];
      for (let index = dependencies.length - 1; index >= 0; index -= 1) {
        pending.push({ itemId: dependencies[index], exiting: false });
      }
    }
  }
  return {
    version: 1,
    lane_id: receipt.lane_id,
    revision: 1,
    repository: receipt.repository,
    base_branch: receipt.base_branch,
    workflow_state: 'ready',
    root_sync: 'pending',
    authority: null,
    items,
  };
}

function applyReceipt(projection, receipt) {
  const next = structuredClone(projection);
  const item = receipt.item_id === null ? null : next.items[receipt.item_id];
  switch (receipt.event) {
    case 'workflow.started': next.workflow_state = 'running'; break;
    case 'item.dispatched': item.state = 'dispatching'; item.dispatch_id = receipt.dispatch_id; item.base_sha = receipt.payload.base_sha; break;
    case 'worker.started': item.state = 'implementing'; item.attempt = receipt.attempt; item.dispatch_id = receipt.dispatch_id; item.branch = receipt.payload.branch; item.worktree = receipt.payload.worktree; break;
    case 'worker.completed': item.state = 'implementation-complete'; item.commit_sha = receipt.payload.committed_head_sha; break;
    case 'pr.opened':
    case 'pr.updated': item.state = 'pr-open'; item.pr_number = receipt.pr_number; item.head_sha = receipt.head_sha; item.review = null; item.pending_review = null; break;
    case 'review.started': item.state = 'in-review'; item.pending_review = { receipt_id: receipt.receipt_id, checks: normalizedCheckIdentities(receipt.payload.checks) }; break;
    case 'review.completed':
      if (receipt.payload.outcome === 'merge') item.state = 'merge-ready';
      if (receipt.payload.outcome === 'block') item.state = 'fix-back-pending';
      if (receipt.payload.outcome === 'needs-human-check') item.state = 'needs-human-check-terminal';
      item.review = { ...structuredClone(receipt.payload), receipt_id: receipt.receipt_id, check_run_ids: receipt.payload.checks.map((check) => check.run_id) };
      item.pending_review = null;
      break;
    case 'evidence.invalidated': item.state = 'pr-open'; item.head_sha = receipt.head_sha; item.review = null; item.pending_review = null; break;
    case 'fix_back.started': item.state = 'fix-back'; item.attempt = receipt.attempt; break;
    case 'merge.completed': item.state = 'merged'; item.merge_sha = receipt.payload.merge_sha; next.authority.consumed_operations.push(authorityConsumptionKey('merge', item.issue_number)); break;
    case 'cleanup.started': item.state = 'cleanup-pending'; break;
    case 'cleanup.completed':
    case 'cleanup.skipped': item.state = 'done'; next.authority.consumed_operations.push(authorityConsumptionKey('cleanup', item.issue_number)); break;
    case 'cleanup.blocked': item.state = 'blocked-dirty-worktree'; break;
    case 'release_handoff.created': item.state = 'release-handoff'; break;
    case 'authority.granted': next.authority = { repository: receipt.payload.repository, lane_id: receipt.payload.lane_id, issues: [...receipt.payload.issues], operations: [...receipt.payload.operations], consumed_operations: [], receipt_id: receipt.receipt_id }; break;
    case 'root_sync.completed': next.root_sync = 'completed'; next.root_sync_receipt_id = receipt.receipt_id; next.authority.consumed_operations.push('root-sync'); break;
    case 'root_sync.skipped': next.root_sync = 'skipped'; next.root_sync_receipt_id = receipt.receipt_id; next.authority.consumed_operations.push('root-sync'); break;
    case 'root_sync.blocked': next.root_sync = 'blocked'; next.workflow_state = 'blocked-terminal'; break;
    case 'item.blocked': item.state = receipt.payload.error_state; item.error_code = receipt.payload.error_code; break;
    case 'workflow.completed': next.workflow_state = 'done'; break;
    case 'workflow.blocked': next.workflow_state = 'blocked-terminal'; break;
    default: fail('ERR_ILLEGAL_TRANSITION', `cannot apply event: ${receipt.event}`);
  }
  next.revision += 1;
  return next;
}

export function replayReceipts(receipts) {
  assertSchema(Array.isArray(receipts) && receipts.length > 0, 'receipts must be a non-empty array');
  const seen = new Set();
  let projection = null;
  for (const receipt of receipts) {
    assertReceipt(isObject(receipt), 'receipt must be an object');
    if (seen.has(receipt.receipt_id)) fail('ERR_DUPLICATE_RECEIPT', `duplicate receipt_id: ${receipt.receipt_id}`);
    validateLegalTransition(projection, receipt, { capability: REPLAY_CAPABILITY });
    seen.add(receipt.receipt_id);
    projection = projection === null ? createProjection(receipt) : applyReceipt(projection, receipt);
  }
  return projection;
}

export function validateProjection(ledger) {
  const replayed = replayReceipts(ledger.receipts);
  if (!isDeepStrictEqual(ledger.projection, replayed) || ledger.revision !== replayed.revision || ledger.lane_id !== replayed.lane_id || ledger.repository !== replayed.repository) fail('ERR_PROJECTION_DRIFT', 'projection does not exactly equal receipt replay');
  return replayed;
}

export function parseLedger(input) {
  let ledger;
  try {
    ledger = typeof input === 'string' || input instanceof Uint8Array ? JSON.parse(input.toString()) : structuredClone(input);
  } catch (cause) {
    fail('ERR_INVALID_SCHEMA', 'ledger is not valid JSON', { cause });
  }
  assertSchema(isObject(ledger), 'ledger must be an object');
  if (ledger.version !== 1) fail('ERR_UNSUPPORTED_VERSION', 'ledger version must be 1');
  assertSchema(Object.keys(ledger).length === 6 && ['version', 'lane_id', 'revision', 'repository', 'receipts', 'projection'].every((key) => Object.hasOwn(ledger, key)), 'ledger envelope is invalid');
  validateLaneId(ledger.lane_id);
  assertSchema(Number.isInteger(ledger.revision) && ledger.revision > 0, 'revision must be a positive integer');
  assertSchema(typeof ledger.repository === 'string', 'repository is required');
  assertSchema(Array.isArray(ledger.receipts), 'receipts must be an array');
  assertSchema(isObject(ledger.projection), 'projection must be an object');
  validateDataMinimization(ledger);
  validateProjection(ledger);
  return ledger;
}

export function createLedger(receipt) {
  validateLegalTransition(null, receipt);
  const projection = replayReceipts([receipt]);
  return { version: 1, lane_id: receipt.lane_id, revision: 1, repository: receipt.repository, receipts: [structuredClone(receipt)], projection };
}

export function isTerminalItemState(state) {
  return state === 'done' || state === 'release-handoff' || TERMINAL_ITEMS.has(state);
}

export function isTerminalWorkflowState(state) {
  return state === 'done' || state === 'blocked-terminal';
}

export function isLedgerTerminal(ledger) {
  const parsed = parseLedger(ledger);
  return isTerminalWorkflowState(parsed.projection.workflow_state) && Object.values(parsed.projection.items).every((item) => isTerminalItemState(item.state));
}

function descriptorPrefix() {
  if (platform() === 'linux' && existsSync('/proc/self/fd')) return '/proc/self/fd';
  fail('ERR_PATH_OUTSIDE_ROOT', 'descriptor-relative traversal is unsupported on this runtime');
}

function openDirectory(path) {
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    if (!fstatSync(descriptor).isDirectory()) fail('ERR_INVALID_TARGET_TYPE', `${path} is not a directory`);
    return descriptor;
  } catch (cause) {
    if (descriptor !== undefined) { closeSync(descriptor); descriptor = undefined; }
    if (cause instanceof LaneLedgerError) throw cause;
    let isSymlink = cause?.code === 'ELOOP';
    try { isSymlink ||= lstatSync(path).isSymbolicLink(); } catch {}
    if (isSymlink) fail('ERR_PATH_SYMLINK', `${path} is a symlink`, { cause });
    fail('ERR_INVALID_TARGET_TYPE', `cannot open required directory: ${path}`, { cause });
  }
}

function childPath(prefix, descriptor, name) {
  return `${prefix}/${String(descriptor)}/${name}`;
}

function openBoundDirectory(path, label) {
  const canonical = resolve(path);
  let descriptor;
  try {
    const before = lstatSync(canonical);
    if (before.isSymbolicLink()) fail('ERR_PATH_SYMLINK', `${label} is a symlink`);
    if (!before.isDirectory()) fail('ERR_INVALID_TARGET_TYPE', `${label} is not a directory`);
    if (realpathSync(canonical) !== canonical) fail('ERR_PATH_SYMLINK', `${label} contains symlink traversal`);
    descriptor = openDirectory(canonical);
    const opened = fstatSync(descriptor);
    const after = lstatSync(canonical);
    if (after.dev !== opened.dev || after.ino !== opened.ino) fail('ERR_PATH_OUTSIDE_ROOT', `${label} changed while opening`);
    return { path: canonical, descriptor, dev: opened.dev, ino: opened.ino, label };
  } catch (cause) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (cause instanceof LaneLedgerError) throw cause;
    if (cause?.code === 'ELOOP') fail('ERR_PATH_SYMLINK', `${label} is a symlink`, { cause });
    fail('ERR_INVALID_TARGET_TYPE', `${label} cannot be opened`, { cause });
  }
}

function assertBoundDirectory(binding) {
  let current;
  try {
    current = lstatSync(binding.path);
  } catch (cause) {
    fail('ERR_PATH_OUTSIDE_ROOT', `${binding.label} is no longer reachable`, { cause });
  }
  if (current.isSymbolicLink()) fail('ERR_PATH_SYMLINK', `${binding.label} became a symlink`);
  if (!current.isDirectory()) fail('ERR_INVALID_TARGET_TYPE', `${binding.label} is no longer a directory`);
  let canonical;
  try { canonical = realpathSync(binding.path); } catch (cause) { fail('ERR_PATH_OUTSIDE_ROOT', `${binding.label} cannot be canonicalized`, { cause }); }
  if (canonical !== binding.path) fail('ERR_PATH_SYMLINK', `${binding.label} contains symlink traversal`);
  const opened = fstatSync(binding.descriptor);
  if (current.dev !== binding.dev || current.ino !== binding.ino || opened.dev !== binding.dev || opened.ino !== binding.ino) {
    fail('ERR_PATH_OUTSIDE_ROOT', `${binding.label} identity changed`);
  }
}

function assertStoreParents(store) {
  if (store.kind !== 'bound-path') return;
  for (const binding of store.bindings) assertBoundDirectory(binding);
}

function openDarwinRuntimeLedgerStore(workspace) {
  const bindings = [];
  try {
    const workspaceBinding = openBoundDirectory(workspace, 'workspace');
    bindings.push(workspaceBinding);
    const omoBinding = openBoundDirectory(join(workspace, '.omo'), '.omo');
    bindings.push(omoBinding);
    const lanesPath = join(workspace, '.omo', 'lanes');
    const lanesBinding = openBoundDirectory(lanesPath, 'lanes');
    bindings.push(lanesBinding);
    for (const binding of bindings) assertBoundDirectory(binding);
    const locksPath = join(lanesPath, '.locks');
    try { mkdirSync(locksPath, { mode: 0o700 }); } catch (cause) { if (cause?.code !== 'EEXIST') throw cause; }
    for (const binding of bindings) assertBoundDirectory(binding);
    const locksBinding = openBoundDirectory(locksPath, 'locks');
    bindings.push(locksBinding);
    return {
      kind: 'bound-path', workspace, lanesPath, locksPath, bindings,
      lanesFd: lanesBinding.descriptor, locksFd: locksBinding.descriptor,
      close() { for (const binding of [...bindings].reverse()) closeSync(binding.descriptor); },
    };
  } catch (cause) {
    for (const binding of [...bindings].reverse()) closeSync(binding.descriptor);
    throw cause;
  }
}

export function openRuntimeLedgerStore(workspacePath) {
  const workspace = resolve(workspacePath);
  if (realpathSync(workspace) !== workspace) fail('ERR_PATH_SYMLINK', 'workspace path contains symlink traversal');
  if (platform() === 'darwin') return openDarwinRuntimeLedgerStore(workspace);
  const prefix = descriptorPrefix();
  const workspaceFd = openDirectory(workspace);
  let omoFd;
  let lanesFd;
  let locksFd;
  try {
    omoFd = openDirectory(childPath(prefix, workspaceFd, '.omo'));
    lanesFd = openDirectory(childPath(prefix, omoFd, 'lanes'));
    const locksPath = childPath(prefix, lanesFd, '.locks');
    try { mkdirSync(locksPath, { mode: 0o700 }); } catch (cause) { if (cause?.code !== 'EEXIST') throw cause; }
    locksFd = openDirectory(locksPath);
  } catch (cause) {
    for (const fd of [locksFd, lanesFd, omoFd, workspaceFd]) if (fd !== undefined) closeSync(fd);
    throw cause;
  }
  return {
    kind: 'descriptor', prefix, workspace, workspaceFd, omoFd, lanesFd, locksFd,
    close() { for (const fd of [locksFd, lanesFd, omoFd, workspaceFd]) closeSync(fd); },
  };
}

export function probeRuntimeDescriptorTraversal(workspacePath) {
  try {
    const store = openRuntimeLedgerStore(workspacePath);
    const prefix = store.prefix;
    const strategy = store.kind;
    store.close();
    return { supported: true, prefix, strategy };
  } catch (error) {
    if (error instanceof LaneLedgerError && error.code === 'ERR_PATH_OUTSIDE_ROOT' && /descriptor-relative traversal is unsupported|directory traversal is unavailable/u.test(error.message)) {
      return { supported: false, code: error.code, reason: error.message };
    }
    throw error;
  }
}

export function openTestLedgerStore(workspacePath, hooks = {}) {
  const workspace = resolve(workspacePath);
  const lanesPath = join(workspace, '.omo', 'lanes');
  mkdirSync(join(lanesPath, '.locks'), { recursive: true, mode: 0o700 });
  const store = { kind: 'test-path', workspace, lanesPath, locksPath: join(lanesPath, '.locks'), close() {} };
  TEST_STORE_HOOKS.set(store, Object.freeze({ ...hooks }));
  return store;
}

function runTestStoreHook(store, name, context) {
  const hook = TEST_STORE_HOOKS.get(store)?.[name];
  if (typeof hook === 'function') hook(context);
}

function pendingDurabilityFor(store) {
  let pending = PENDING_DURABILITY.get(store);
  if (pending === undefined) {
    pending = new Map();
    PENDING_DURABILITY.set(store, pending);
  }
  return pending;
}

function markPendingDurability(store, laneId, ledger) {
  pendingDurabilityFor(store).set(laneId, ledger);
}

function hasPendingDurability(store, laneId, ledger) {
  return isDeepStrictEqual(PENDING_DURABILITY.get(store)?.get(laneId), ledger);
}

function clearPendingDurability(store, laneId) {
  const pending = PENDING_DURABILITY.get(store);
  pending?.delete(laneId);
  if (pending?.size === 0) PENDING_DURABILITY.delete(store);
}

function durabilityMarkerPath(store, laneId) {
  return storePath(store, 'lane', `.${validateLaneId(laneId)}.durability.json`);
}

function durabilityMarkerFor(laneId, ledger, publication = {}) {
  return {
    lane_id: laneId,
    revision: ledger.revision,
    receipt_id: ledger.receipts.at(-1)?.receipt_id ?? null,
    ledger_sha256: createHash('sha256').update(JSON.stringify(ledger)).digest('hex'),
    temporary_basename: publication.temporaryBasename ?? null,
  };
}

function readDurabilityMarker(store, laneId) {
  const path = durabilityMarkerPath(store, laneId);
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const identity = fstatSync(descriptor);
    if (!identity.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'durability marker must be a regular file');
    const bytes = readFileSync(descriptor, 'utf8');
    const marker = JSON.parse(bytes);
    const markerKeys = ['lane_id', 'ledger_sha256', 'receipt_id', 'revision', 'temporary_basename'];
    const validTemporary = typeof marker.temporary_basename === 'string' && /^\.lane-[a-z0-9-]+\.\d+\.[a-f0-9-]+\.tmp$/u.test(marker.temporary_basename);
    if (!isObject(marker) || !isDeepStrictEqual(Object.keys(marker).sort(), markerKeys) || marker.lane_id !== laneId || !Number.isInteger(marker.revision) || typeof marker.receipt_id !== 'string' || !DIGEST_PATTERN.test(marker.ledger_sha256) || !validTemporary) {
      fail('ERR_DURABILITY_UNCERTAIN', 'durability marker is malformed');
    }
    return { path, identity, marker, bytes };
  } catch (cause) {
    if (cause?.code === 'ENOENT') return null;
    if (cause instanceof LaneLedgerError) throw cause;
    if (cause?.code === 'ELOOP') fail('ERR_PATH_SYMLINK', 'durability marker is a symlink', { cause });
    fail('ERR_DURABILITY_UNCERTAIN', 'durability marker cannot be read', { cause });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function markerMatchesLedger(marker, laneId, ledger) {
  return marker?.marker.lane_id === laneId
    && marker.marker.revision === ledger.revision
    && marker.marker.receipt_id === ledger.receipts.at(-1)?.receipt_id
    && marker.marker.ledger_sha256 === durabilityMarkerFor(laneId, ledger).ledger_sha256;
}

function writeDurabilityMarker(store, laneId, ledger, parentDescriptor, publication) {
  const path = durabilityMarkerPath(store, laneId);
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
    const identity = fstatSync(descriptor);
    if (!identity.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'durability marker must be a regular file');
    const bytes = `${JSON.stringify(durabilityMarkerFor(laneId, ledger, publication))}\n`;
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    fsyncSync(parentDescriptor);
    return { path, identity, bytes };
  } catch (cause) {
    if (cause instanceof LaneLedgerError) throw cause;
    fail('ERR_DURABILITY_UNCERTAIN', 'durability marker cannot be created', { cause });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function removeDurabilityMarker(store, marker, parentDescriptor) {
  if (!marker) return;
  const quarantinePath = `${marker.path}.remove-${randomUUID()}`;
  let moved = false;
  try {
    runTestStoreHook(store, 'beforeDurabilityMarkerRemoval', { path: marker.path, quarantinePath });
    assertStoreParents(store);
    renameSync(marker.path, quarantinePath);
    moved = true;
    const current = lstatSync(quarantinePath);
    if (!current.isFile() || current.dev !== marker.identity.dev || current.ino !== marker.identity.ino || readFileSync(quarantinePath, 'utf8') !== marker.bytes) {
      try { linkSync(quarantinePath, marker.path); } catch {}
      fail('ERR_DURABILITY_UNCERTAIN', 'durability marker identity changed');
    }
    runTestStoreHook(store, 'afterDurabilityMarkerQuarantineFinalCheck', { quarantinePath });
    fsyncSync(parentDescriptor);
  } catch (cause) {
    if (moved) { try { linkSync(quarantinePath, marker.path); } catch {} }
    if (cause instanceof LaneLedgerError) throw cause;
    fail('ERR_DURABILITY_UNCERTAIN', 'durability marker cannot be removed', { cause });
  }
}

function removeReconciledDurabilityMarker(store, marker) {
  const parent = openStoreParent(store, 'lane');
  try { removeDurabilityMarker(store, marker, parent.descriptor); } finally { closeStoreParent(parent); }
}

function storePath(store, kind, name) {
  if (store.kind === 'descriptor') {
    const descriptor = kind === 'lane' ? store.lanesFd : store.locksFd;
    return `${store.prefix}/${String(descriptor)}/${name}`;
  }
  assertStoreParents(store);
  return join(kind === 'lane' ? store.lanesPath : store.locksPath, name);
}

function lanePath(store, laneId) {
  return storePath(store, 'lane', `${validateLaneId(laneId)}.json`);
}

function readStoredLedger(store, laneId, optional = false) {
  assertStoreParents(store);
  const path = lanePath(store, laneId);
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    assertStoreParents(store);
    if (!fstatSync(descriptor).isFile()) fail('ERR_INVALID_TARGET_TYPE', 'ledger target must be a regular file');
    return parseLedger(readFileSync(descriptor));
  } catch (cause) {
    if (descriptor !== undefined) { closeSync(descriptor); descriptor = undefined; }
    if (optional && cause?.code === 'ENOENT') return null;
    if (cause instanceof LaneLedgerError) throw cause;
    let isSymlink = cause?.code === 'ELOOP';
    try { isSymlink ||= lstatSync(path).isSymbolicLink(); } catch {}
    if (isSymlink) fail('ERR_PATH_SYMLINK', 'ledger target is a symlink', { cause });
    if (cause?.code === 'EISDIR') fail('ERR_INVALID_TARGET_TYPE', 'ledger target is a directory', { cause });
    fail('ERR_INVALID_SCHEMA', 'ledger target cannot be read', { cause });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function parseLockMetadata(bytes, laneId) {
  let value;
  try { value = JSON.parse(bytes); } catch { return { metadata: null, liveness: null }; }
  if (!isObject(value) || value.lane_id !== laneId || typeof value.host !== 'string' || value.host.length === 0 || !Number.isInteger(value.pid) || value.pid <= 0) {
    return { metadata: null, liveness: null };
  }
  const liveness = { host: value.host, pid: value.pid };
  if (!isDeepStrictEqual(Object.keys(value).sort(), ['created_at', 'host', 'lane_id', 'owner_token', 'pid'])) return { metadata: null, liveness };
  if (typeof value.owner_token !== 'string' || value.owner_token.length === 0) return { metadata: null, liveness };
  if (typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at)) || !/(?:Z|[+-]\d\d:\d\d)$/u.test(value.created_at)) return { metadata: null, liveness };
  return { metadata: value, liveness };
}

function openLockFile(store, lockPath, laneId) {
  assertStoreParents(store);
  let descriptor;
  try {
    descriptor = openSync(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const identity = fstatSync(descriptor);
    if (!identity.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'canonical lock must be a regular file');
    const bytes = readDescriptorBytes(descriptor, identity.size);
    assertStoreParents(store);
    return { path: lockPath, descriptor, dev: identity.dev, ino: identity.ino, identity, bytes, laneId, ...parseLockMetadata(bytes, laneId) };
  } catch (cause) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (cause instanceof LaneLedgerError) throw cause;
    if (cause?.code === 'ELOOP') fail('ERR_PATH_SYMLINK', 'canonical lock is a symlink', { cause });
    throw cause;
  }
}

function openStoreParent(store, kind) {
  assertStoreParents(store);
  if (store.kind !== 'test-path') return { descriptor: kind === 'lane' ? store.lanesFd : store.locksFd, owned: false };
  const path = kind === 'lane' ? store.lanesPath : store.locksPath;
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  if (!fstatSync(descriptor).isDirectory()) {
    closeSync(descriptor);
    fail('ERR_INVALID_TARGET_TYPE', `${kind} parent must be a directory`);
  }
  return { descriptor, owned: true };
}

function closeStoreParent(parent) {
  if (parent.owned) closeSync(parent.descriptor);
}

function assertQuarantinedLock(store, lock, quarantinePath) {
  assertStoreParents(store);
  const opened = fstatSync(lock.descriptor);
  if (opened.dev !== lock.dev || opened.ino !== lock.ino) fail('ERR_LOCK_BUSY', 'lane lock descriptor identity changed');
  let current;
  try { current = lstatSync(quarantinePath); } catch (cause) { fail('ERR_LOCK_BUSY', 'quarantined lane lock is no longer reachable', { cause }); }
  if (current.isSymbolicLink()) fail('ERR_PATH_SYMLINK', 'quarantined lane lock became a symlink');
  if (!current.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'quarantined lane lock is no longer a regular file');
  if (current.dev !== lock.dev || current.ino !== lock.ino) fail('ERR_LOCK_BUSY', 'quarantined lane lock identity changed');
  if (readFileSync(quarantinePath, 'utf8') !== lock.bytes) fail('ERR_LOCK_BUSY', 'quarantined lane lock bytes changed');
}

function quarantineLock(store, lock) {
  assertOwnedLock(store, lock);
  const quarantineName = `.${lock.laneId}.lock.quarantine-${randomUUID()}`;
  const quarantinePath = storePath(store, 'lock', quarantineName);
  try {
    lstatSync(quarantinePath);
    fail('ERR_LOCK_BUSY', 'lock quarantine destination already exists');
  } catch (cause) {
    if (cause instanceof LaneLedgerError) throw cause;
    if (cause?.code !== 'ENOENT') throw cause;
  }
  runTestStoreHook(store, 'beforeLockQuarantineRename', { canonicalPath: lock.path, ownerPath: lock.path, quarantinePath });
  assertOwnedLock(store, lock);
  assertStoreParents(store);
  renameSync(lock.path, quarantinePath);
  assertStoreParents(store);
  runTestStoreHook(store, 'afterLockQuarantineRename', { canonicalPath: lock.path, quarantinePath });
  assertQuarantinedLock(store, lock, quarantinePath);
  const parent = openStoreParent(store, 'lock');
  try { fsyncSync(parent.descriptor); } finally { closeStoreParent(parent); }
  assertStoreParents(store);
}

function acquireLock(store, laneId, timeoutMs) {
  const lockName = `${laneId}.lock`;
  const lockPath = storePath(store, 'lock', lockName);
  const started = Date.now();
  while (true) {
    let claimDescriptor;
    try {
      assertStoreParents(store);
      const claimPath = storePath(store, 'lock', `.${laneId}.lock.claim-${randomUUID()}`);
      const ownerToken = randomUUID();
      const bytes = `${JSON.stringify({ lane_id: laneId, host: hostname(), pid: process.pid, created_at: new Date().toISOString(), owner_token: ownerToken })}\n`;
      claimDescriptor = openSync(claimPath, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
      const claimIdentity = fstatSync(claimDescriptor);
      if (!claimIdentity.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'private lock claim must be a regular file');
      writeFileSync(claimDescriptor, bytes);
      fsyncSync(claimDescriptor);
      assertStoreParents(store);
      runTestStoreHook(store, 'beforeLockPublish', { claimPath, canonicalPath: lockPath, ownerPath: claimPath });
      const privateIdentity = lstatSync(claimPath);
      if (!privateIdentity.isFile() || privateIdentity.dev !== claimIdentity.dev || privateIdentity.ino !== claimIdentity.ino || readFileSync(claimPath, 'utf8') !== bytes) fail('ERR_LOCK_BUSY', 'private lock claim changed before publication');
      runTestStoreHook(store, 'afterLockFinalTargetCheck', { claimPath, canonicalPath: lockPath, ownerPath: claimPath });
      linkSync(claimPath, lockPath);
      runTestStoreHook(store, 'afterLockPublish', { claimPath, canonicalPath: lockPath, ownerPath: claimPath });
      const lock = openLockFile(store, lockPath, laneId);
      if (lock.dev !== claimIdentity.dev || lock.ino !== claimIdentity.ino || lock.bytes !== bytes || lock.metadata?.owner_token !== ownerToken) {
        closeSync(lock.descriptor);
        fail('ERR_LOCK_BUSY', 'published lane lock differs from its private claim');
      }
      const lockParent = openStoreParent(store, 'lock');
      try { fsyncSync(lockParent.descriptor); } finally { closeStoreParent(lockParent); }
      closeSync(claimDescriptor);
      claimDescriptor = undefined;
      return { ...lock, claimPath, ownerToken };
    } catch (cause) {
      if (claimDescriptor !== undefined) closeSync(claimDescriptor);
      if (cause?.code !== 'EEXIST') throw cause;
      if (Date.now() - started < timeoutMs) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(20, timeoutMs));
        continue;
      }
      let existing;
      try {
        existing = openLockFile(store, lockPath, laneId);
        if (existing.liveness?.host === hostname()) {
          let dead = false;
          try {
            runTestStoreHook(store, 'probeLockOwner', { pid: existing.liveness.pid });
            process.kill(existing.liveness.pid, 0);
          } catch (probe) {
            dead = probe?.code === 'ESRCH';
          }
          if (dead) {
            if (existing.metadata === null) fail('ERR_STALE_LOCK', 'dead same-host lock metadata is not reclaimable');
            try {
              quarantineLock(store, existing);
            } catch (error) {
              fail('ERR_STALE_LOCK', 'dead same-host lock changed during reclamation', { cause: error });
            }
            continue;
          }
        }
      } catch (metadataError) {
        if (metadataError instanceof LaneLedgerError) throw metadataError;
        throw metadataError;
      } finally {
        if (existing !== undefined) { try { closeSync(existing.descriptor); } catch {} }
      }
      fail('ERR_LOCK_BUSY', 'lane ledger lock wait timed out');
    }
  }
}

function assertOwnedLock(store, lock) {
  assertStoreParents(store);
  const opened = fstatSync(lock.descriptor);
  if (opened.dev !== lock.dev || opened.ino !== lock.ino) fail('ERR_LOCK_BUSY', 'lane lock descriptor identity changed');
  let current;
  try { current = lstatSync(lock.path); } catch (cause) { fail('ERR_LOCK_BUSY', 'lane lock is no longer reachable', { cause }); }
  if (current.isSymbolicLink()) fail('ERR_PATH_SYMLINK', 'lane lock became a symlink');
  if (!current.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'lane lock is no longer a regular file');
  if (current.dev !== lock.dev || current.ino !== lock.ino) fail('ERR_LOCK_BUSY', 'lane lock identity changed');
  const bytes = readDescriptorBytes(lock.descriptor, opened.size);
  if (bytes !== lock.bytes) fail('ERR_LOCK_BUSY', 'lane lock bytes changed');
}

function releaseLock(store, lock) {
  try {
    assertOwnedLock(store, lock);
    const { metadata } = parseLockMetadata(lock.bytes, lock.laneId);
    if (metadata.owner_token !== lock.ownerToken || metadata.pid !== process.pid || metadata.host !== hostname()) fail('ERR_LOCK_BUSY', 'lane lock ownership changed');
    quarantineLock(store, lock);
  } finally {
    closeSync(lock.descriptor);
  }
}

function assertOptionalRegularTarget(path, label) {
  try {
    const target = lstatSync(path);
    if (target.isSymbolicLink()) fail('ERR_PATH_SYMLINK', `${label} is a symlink`);
    if (!target.isFile()) fail('ERR_INVALID_TARGET_TYPE', `${label} must be a regular file`);
    return target;
  } catch (cause) {
    if (cause?.code === 'ENOENT') return null;
    if (cause instanceof LaneLedgerError) throw cause;
    fail('ERR_INVALID_TARGET_TYPE', `${label} cannot be inspected`, { cause });
  }
}

function assertExpectedTarget(path, expected, label) {
  const current = assertOptionalRegularTarget(path, label);
  if (expected === null) {
    if (current !== null) fail('ERR_PATH_OUTSIDE_ROOT', `${label} appeared before publication`);
    return null;
  }
  if (current === null || current.dev !== expected.dev || current.ino !== expected.ino) fail('ERR_PATH_OUTSIDE_ROOT', `${label} identity changed`);
  return current;
}

function readDescriptorBytes(descriptor, size) {
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(descriptor, bytes, offset, size - offset, offset);
    if (count === 0) break;
    offset += count;
  }
  if (offset !== size) fail('ERR_INVALID_SCHEMA', 'ledger descriptor size changed while reading');
  return bytes.toString('utf8');
}

function assertExpectedLedgerTarget(store, expectation) {
  assertStoreParents(store);
  const opened = fstatSync(expectation.descriptor);
  if (!opened.isFile() || opened.dev !== expectation.identity.dev || opened.ino !== expectation.identity.ino) fail('ERR_PATH_OUTSIDE_ROOT', 'ledger descriptor identity changed');
  assertExpectedTarget(expectation.target, expectation.identity, 'ledger target');
  const parsed = parseLedger(readDescriptorBytes(expectation.descriptor, opened.size));
  if (!isDeepStrictEqual(parsed, expectation.ledger)) fail('ERR_PROJECTION_DRIFT', 'ledger target differs from the reconciled ledger');
  const afterRead = fstatSync(expectation.descriptor);
  if (afterRead.dev !== opened.dev || afterRead.ino !== opened.ino || afterRead.size !== opened.size) fail('ERR_PATH_OUTSIDE_ROOT', 'ledger descriptor changed while reading');
}

function persistLedger(store, laneId, ledger) {
  assertStoreParents(store);
  const target = lanePath(store, laneId);
  const temporaryName = `.${laneId}.${String(process.pid)}.${randomUUID()}.tmp`;
  const temporary = storePath(store, 'lane', temporaryName);
  let descriptor;
  let temporaryIdentity;
  let parent;
  let durabilityMarker;
  let expectedTarget;
  let published = false;
  try {
    descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
    temporaryIdentity = fstatSync(descriptor);
    if (!temporaryIdentity.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'temporary ledger must be a regular file');
    assertStoreParents(store);
    writeFileSync(descriptor, `${JSON.stringify(ledger, null, 2)}\n`);
    fsyncSync(descriptor);
    assertStoreParents(store);
    expectedTarget = assertOptionalRegularTarget(target, 'ledger target');
    const ownedTemporary = fstatSync(descriptor);
    if (!ownedTemporary.isFile() || ownedTemporary.dev !== temporaryIdentity.dev || ownedTemporary.ino !== temporaryIdentity.ino) fail('ERR_PATH_OUTSIDE_ROOT', 'temporary ledger descriptor identity changed');
    const temporaryTarget = assertOptionalRegularTarget(temporary, 'temporary ledger');
    if (!temporaryTarget || temporaryTarget.dev !== ownedTemporary.dev || temporaryTarget.ino !== ownedTemporary.ino) fail('ERR_PATH_OUTSIDE_ROOT', 'temporary ledger identity changed');
    parent = openStoreParent(store, 'lane');
    if (expectedTarget !== null) {
      parseLedger(readFileSync(target, 'utf8'));
      assertExpectedTarget(target, expectedTarget, 'ledger target');
    }
    durabilityMarker = writeDurabilityMarker(store, laneId, ledger, parent.descriptor, {
      temporaryBasename: basename(temporary),
    });
    runTestStoreHook(store, 'beforeLedgerRename', { target, temporary });
    assertStoreParents(store);
    assertExpectedTarget(target, expectedTarget, 'ledger target');
    runTestStoreHook(store, 'afterLedgerFinalTargetCheck', { target, temporary });
    assertExpectedTarget(target, expectedTarget, 'ledger target');
    const finalTemporary = assertOptionalRegularTarget(temporary, 'temporary ledger');
    if (!finalTemporary || finalTemporary.dev !== temporaryIdentity.dev || finalTemporary.ino !== temporaryIdentity.ino) fail('ERR_PATH_OUTSIDE_ROOT', 'temporary ledger identity changed before publication');
    renameSync(temporary, target);
    published = true;
    runTestStoreHook(store, 'afterLedgerRename', { target });
    assertStoreParents(store);
    assertExpectedTarget(target, temporaryIdentity, 'published ledger target');
    runTestStoreHook(store, 'beforeLedgerParentFsync', { target });
    assertStoreParents(store);
    assertExpectedTarget(target, temporaryIdentity, 'published ledger target');
    fsyncSync(parent.descriptor);
    removeDurabilityMarker(store, durabilityMarker, parent.descriptor);
    durabilityMarker = undefined;
  } catch (cause) {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch {}
      descriptor = undefined;
    }
    if (!published) {
      if (durabilityMarker !== undefined && parent !== undefined) {
        try { removeDurabilityMarker(store, durabilityMarker, parent.descriptor); } catch {}
      }
      if (parent !== undefined) { try { closeStoreParent(parent); } catch {} }
      throw cause;
    }
    if (parent !== undefined) { try { closeStoreParent(parent); } catch {} }
    markPendingDurability(store, laneId, ledger);
    fail('ERR_DURABILITY_UNCERTAIN', 'ledger publication durability is uncertain', { cause });
  }
  try { closeStoreParent(parent); } catch {}
  try { closeSync(descriptor); } catch {}
  clearPendingDurability(store, laneId);
}

function confirmStoredLedgerDurability(store, laneId, ledger) {
  assertStoreParents(store);
  const target = lanePath(store, laneId);
  const descriptor = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let parent;
  try {
    const identity = fstatSync(descriptor);
    if (!identity.isFile()) fail('ERR_INVALID_TARGET_TYPE', 'ledger target must be a regular file');
    const expectation = { descriptor, target, identity, ledger };
    assertExpectedLedgerTarget(store, expectation);
    parent = openStoreParent(store, 'lane');
    runTestStoreHook(store, 'beforeLedgerParentFsync', { target });
    assertExpectedLedgerTarget(store, expectation);
    fsyncSync(descriptor);
    assertStoreParents(store);
    fsyncSync(parent.descriptor);
    const marker = readDurabilityMarker(store, laneId);
    if (marker !== null) {
      if (!markerMatchesLedger(marker, laneId, ledger)) fail('ERR_DURABILITY_UNCERTAIN', 'durability marker does not bind the published ledger');
      removeDurabilityMarker(store, marker, parent.descriptor);
    }
    clearPendingDurability(store, laneId);
  } catch (cause) {
    fail('ERR_DURABILITY_UNCERTAIN', 'published ledger durability cannot be confirmed', { cause });
  } finally {
    try { closeSync(descriptor); } catch {}
    if (parent !== undefined) { try { closeStoreParent(parent); } catch {} }
  }
}

function reconcilePublishedReceipt(store, laneId, ledger, receipt, capability) {
  const duplicate = ledger.receipts.find((candidate) => candidate.receipt_id === receipt.receipt_id);
  const expectedRevision = receipt.expected_revision + 1;
  const finalReceipt = ledger.receipts.at(-1);
  const durableMarker = readDurabilityMarker(store, laneId);
  if ((hasPendingDurability(store, laneId, ledger) || markerMatchesLedger(durableMarker, laneId, ledger)) && ledger.revision === expectedRevision && finalReceipt?.receipt_id === receipt.receipt_id && isDeepStrictEqual(finalReceipt, receipt)) {
    confirmStoredLedgerDurability(store, laneId, ledger);
    return ledger;
  }
  if (duplicate !== undefined) fail('ERR_DUPLICATE_RECEIPT', 'receipt_id already exists');
  if (ledger.revision !== receipt.expected_revision) fail('ERR_REVISION_CONFLICT', 'expected revision no longer matches');
  if (durableMarker !== null) {
    const stagedLedger = stageLockedReceipt(ledger, receipt, capability);
    if (!markerMatchesLedger(durableMarker, laneId, stagedLedger)) fail('ERR_DURABILITY_UNCERTAIN', 'orphan durability marker conflicts with the retry receipt');
    removeReconciledDurabilityMarker(store, durableMarker);
  }
  return null;
}

export function createStoredLane(store, receipt, options = {}) {
  assertReceipt(isObject(receipt), 'receipt must be an object');
  validateLaneId(receipt.lane_id);
  const lock = acquireLock(store, receipt.lane_id, options.lockTimeoutMs ?? 5000);
  let ledger;
  try {
    ledger = createLedger(receipt);
    const existing = readStoredLedger(store, receipt.lane_id, true);
    if (existing !== null) {
      if (isDeepStrictEqual(existing, ledger)) {
        const marker = readDurabilityMarker(store, receipt.lane_id);
        if (!hasPendingDurability(store, receipt.lane_id, ledger) && !markerMatchesLedger(marker, receipt.lane_id, ledger)) fail('ERR_REVISION_CONFLICT', 'lane already exists');
        confirmStoredLedgerDurability(store, receipt.lane_id, ledger);
        ledger = existing;
      } else if (existing.receipts.some((candidate) => candidate.receipt_id === receipt.receipt_id)) {
        fail('ERR_DUPLICATE_RECEIPT', 'receipt_id already exists');
      } else {
        fail('ERR_REVISION_CONFLICT', 'lane already exists');
      }
    } else {
      const marker = readDurabilityMarker(store, receipt.lane_id);
      if (marker !== null) {
        if (!markerMatchesLedger(marker, receipt.lane_id, ledger)) fail('ERR_DURABILITY_UNCERTAIN', 'orphan durability marker conflicts with lane creation');
        removeReconciledDurabilityMarker(store, marker);
      }
      assertOwnedLock(store, lock);
      persistLedger(store, receipt.lane_id, ledger);
    }
  } catch (error) {
    try { releaseLock(store, lock); } catch {}
    throw error;
  }
  try { releaseLock(store, lock); } catch {}
  return ledger;
}

export function createStoredLaneFromSourceSelection(store, receipt, sourceHandoff, options = {}) {
  validateLaneCreationFromSourceSelection(receipt, sourceHandoff);
  return createStoredLane(store, receipt, options);
}

function stageLockedReceipt(ledger, receipt, capability) {
  if (ledger.receipts.some((candidate) => candidate.receipt_id === receipt.receipt_id)) fail('ERR_DUPLICATE_RECEIPT', 'receipt_id already exists');
  if (receipt.expected_revision !== ledger.revision) fail('ERR_REVISION_CONFLICT', 'expected revision no longer matches');
  validateLegalTransition(ledger.projection, receipt, { capability });
  const receipts = [...ledger.receipts, structuredClone(receipt)];
  const projection = replayReceipts(receipts);
  return { ...ledger, revision: projection.revision, receipts, projection };
}

function lockedStoredLaneTransaction(store, laneId, operation, callback, options = {}, retryReceipt = null, capability = null) {
  validateLaneId(laneId);
  if (!['transition', 'authorize', 'side-effect'].includes(operation)) fail('ERR_INVALID_SCHEMA', 'stored lane operation is invalid');
  if (typeof callback !== 'function') fail('ERR_INVALID_SCHEMA', 'stored lane transaction callback is required');
  const lock = acquireLock(store, laneId, options.lockTimeoutMs ?? 5000);
  let active = true;
  let stagedLedger = null;
  let appendViolation = false;
  const abort = (error) => {
    active = false;
    try { releaseLock(store, lock); } catch {}
    throw error;
  };
  try {
    const ledger = readStoredLedger(store, laneId);
    if (retryReceipt !== null) {
      const reconciled = reconcilePublishedReceipt(store, laneId, ledger, retryReceipt, capability);
      if (reconciled !== null) {
        active = false;
        try { releaseLock(store, lock); } catch {}
        return deepFreeze(structuredClone(reconciled));
      }
    }
    const append = (receipt) => {
      if (!active) fail('ERR_ILLEGAL_TRANSITION', 'stored lane transaction is no longer active');
      if (stagedLedger !== null) {
        appendViolation = true;
        fail('ERR_ILLEGAL_TRANSITION', 'stored lane transaction accepts exactly one append');
      }
      assertReceipt(isObject(receipt), 'receipt must be an object');
      if (receipt.lane_id !== laneId) fail('ERR_INVALID_RECEIPT', 'receipt lane differs from locked lane');
      stagedLedger = stageLockedReceipt(ledger, receipt, capability);
      const snapshot = deepFreeze(structuredClone(stagedLedger));
      return { ledger: snapshot, projection: snapshot.projection, receipt };
    };
    const result = callback({ ledger: deepFreeze(structuredClone(ledger)), projection: deepFreeze(structuredClone(ledger.projection)), append });
    const commit = (value) => {
      let committed = false;
      try {
        if (appendViolation) fail('ERR_ILLEGAL_TRANSITION', 'stored lane transaction attempted multiple appends');
        if (stagedLedger !== null) {
          assertOwnedLock(store, lock);
          assertStoreParents(store);
          const currentLedger = readStoredLedger(store, laneId);
          if (currentLedger.revision !== ledger.revision || !isDeepStrictEqual(currentLedger, ledger)) fail('ERR_REVISION_CONFLICT', 'stored ledger changed during transaction');
          assertOwnedLock(store, lock);
          persistLedger(store, laneId, stagedLedger);
          committed = true;
        }
      } catch (error) {
        return abort(error);
      }
      active = false;
      if (committed) {
        try { releaseLock(store, lock); } catch {}
      } else {
        releaseLock(store, lock);
      }
      return value;
    };
    if (result && typeof result.then === 'function') return Promise.resolve(result).then(commit, abort);
    return commit(result);
  } catch (error) {
    return abort(error);
  }
}

export function withLockedStoredLaneTransaction(store, laneId, operation, callback, options = {}, retryReceipt = null) {
  if (operation !== 'transition') fail('ERR_INVALID_SCHEMA', 'generic transactions only support transition');
  return lockedStoredLaneTransaction(store, laneId, operation, callback, options, retryReceipt);
}

function withLockedStoredLaneSideEffectTransaction(store, laneId, callback, options = {}, retryReceipt = null) {
  return lockedStoredLaneTransaction(store, laneId, 'side-effect', callback, options, retryReceipt, SIDE_EFFECT_CAPABILITY);
}

export function withTestLockedStoredLaneSideEffectTransaction(store, laneId, callback, options = {}, retryReceipt = null) {
  if (!TEST_STORE_HOOKS.has(store)) fail('ERR_INVALID_SCHEMA', 'test side-effect transactions require a test ledger store');
  return withLockedStoredLaneSideEffectTransaction(store, laneId, callback, options, retryReceipt);
}

export function withRuntimeLockedStoredLaneTransaction(workspace, laneId, operation, callback, options = {}) {
  const store = openRuntimeLedgerStore(workspace);
  const closeSuccess = (value) => {
    try { store.close(); } catch {}
    return value;
  };
  const closeFailure = (error) => {
    try { store.close(); } catch {}
    throw error;
  };
  try {
    const result = withLockedStoredLaneTransaction(store, laneId, operation, callback, options);
    if (result && typeof result.then === 'function') return Promise.resolve(result).then(closeSuccess, closeFailure);
    return closeSuccess(result);
  } catch (error) {
    return closeFailure(error);
  }
}

export async function executeRuntimeWorkflowSideEffect(input) {
  const workspace = discoverWorkspaceRoot();
  const store = openRuntimeLedgerStore(workspace);
  try {
    const { runWorkflowSideEffect } = await import('./workflow-side-effect.mjs');
    return await runWorkflowSideEffect(input, {
      ledger: {
        withLockedLane(laneId, callback) {
          return withLockedStoredLaneSideEffectTransaction(store, laneId, callback);
        },
      },
    });
  } finally {
    try { store.close(); } catch {}
  }
}

export function transitionStoredLane(store, receipt, options = {}) {
  assertReceipt(isObject(receipt), 'receipt must be an object');
  return withLockedStoredLaneTransaction(store, receipt.lane_id, 'transition', ({ append }) => append(receipt).ledger, options, receipt);
}

function authorizeStoredLane(store, receipt, options = {}) {
  assertReceipt(isObject(receipt), 'receipt must be an object');
  if (receipt.event !== 'authority.granted') fail('ERR_ILLEGAL_TRANSITION', 'dedicated authority operation requires authority.granted');
  return lockedStoredLaneTransaction(store, receipt.lane_id, 'authorize', ({ append }) => append(receipt).ledger, options, receipt, AUTHORIZE_CAPABILITY);
}

export function authorizeTestStoredLane(store, receipt, options = {}) {
  if (!TEST_STORE_HOOKS.has(store)) fail('ERR_INVALID_SCHEMA', 'test authorization requires a test ledger store');
  return authorizeStoredLane(store, receipt, options);
}

export function authorizeRuntimeStoredLane(store, input) {
  if (store.kind === 'test-path') fail('ERR_INVALID_SCHEMA', 'runtime authorization requires a runtime ledger store');
  const ledger = validateStoredLane(store, input.laneId);
  const now = new Date().toISOString();
  return authorizeStoredLane(store, {
    version: 1,
    receipt_id: `authority-${randomUUID()}`,
    event: 'authority.granted',
    lane_id: input.laneId,
    item_id: null,
    attempt: 0,
    dispatch_id: null,
    producer: 'dedicated native-approval-gated authorize operation',
    expected_revision: input.expectedRevision,
    repository: input.repository,
    base_branch: ledger.projection.base_branch,
    created_at: now,
    payload: {
      repository: input.repository,
      lane_id: input.laneId,
      issues: input.issues,
      operations: input.operations,
      squash_method: input.squashMethod,
      approved_at: now,
    },
  });
}

export function validateStoredLane(store, laneId) {
  return readStoredLedger(store, validateLaneId(laneId));
}

export function projectStoredLane(store, laneId) {
  return validateStoredLane(store, laneId).projection;
}

export function discoverWorkspaceRoot(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (cause) {
    fail('ERR_PATH_OUTSIDE_ROOT', 'current directory is not inside a Git workspace', { cause });
  }
}

export function operationErrorCodes() {
  return new Set(OPERATION_ERRORS);
}
