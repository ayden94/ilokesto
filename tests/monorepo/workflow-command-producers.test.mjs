import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  LaneLedgerError,
  authorizeTestStoredLane,
  createSourceSelectionFromIssueCandidates,
  createStoredLaneFromSourceSelection,
  openTestLedgerStore,
  transitionStoredLane,
  validateStoredLane,
} from '../../scripts/workflow/lane-ledger.mjs';

const repository = 'ilokesto/ilokesto';
const createdAt = '2026-08-18T09:00:00.000Z';
const issueUrl = (issueNumber) => `https://github.com/${repository}/issues/${String(issueNumber)}`;

function assertCode(code) {
  return (error) => error instanceof LaneLedgerError && error.code === code;
}

function sourceCandidates() {
  return {
    version: 1,
    handoff_id: 'source-selection-task-4',
    event: 'source.candidates',
    repository,
    created_at: createdAt,
    candidates: [
      { issue_number: 101, issue_url: issueUrl(101), disposition: 'registered', approval: 'explicit', provenance: { kind: 'search-run', reference: 'search-run-task-4' } },
      { issue_number: 102, issue_url: issueUrl(102), disposition: 'deferred', approval: 'not-approved', provenance: { kind: 'search-run', reference: 'search-run-task-4' } },
      { issue_number: 103, issue_url: issueUrl(103), disposition: 'rejected', approval: 'not-approved', provenance: { kind: 'search-run', reference: 'search-run-task-4' } },
      { issue_number: 104, issue_url: issueUrl(104), disposition: 'duplicate', approval: 'not-approved', provenance: { kind: 'search-run', reference: 'search-run-task-4' } },
      { issue_number: 105, issue_url: issueUrl(105), disposition: 'direct', approval: 'explicit', provenance: { kind: 'direct-input', reference: 'user-supplied-105' } },
      { issue_number: 106, issue_url: issueUrl(106), disposition: 'registered', approval: 'not-approved', provenance: { kind: 'search-run', reference: 'search-run-task-4' } },
    ],
  };
}

function laneCreated(source, overrides = {}) {
  return {
    version: 1,
    receipt_id: 'lane-created-task-4',
    event: 'lane.created',
    lane_id: 'lane-task-4',
    item_id: null,
    attempt: 0,
    dispatch_id: null,
    producer: 'supervisor create operation',
    expected_revision: 0,
    repository,
    base_branch: 'main',
    created_at: '2026-08-18T09:01:00.000Z',
    payload: {
      source_selection_handoff_id: source.handoff_id,
      items: source.issues.map(({ issue_number: issueNumber, issue_url: selectedIssueUrl }) => ({
        item_id: `issue-${String(issueNumber)}`,
        issue_number: issueNumber,
        issue_url: selectedIssueUrl,
        hard_dependencies: issueNumber === 105 ? ['issue-101'] : [],
        ordering_dependencies: [],
      })),
    },
    ...overrides,
  };
}

function authorityReceipt(revision = 1) {
  return {
    version: 1,
    receipt_id: 'authority-task-4',
    event: 'authority.granted',
    lane_id: 'lane-task-4',
    item_id: null,
    attempt: 0,
    dispatch_id: null,
    producer: 'dedicated native-approval-gated authorize operation',
    expected_revision: revision,
    repository,
    base_branch: 'main',
    created_at: '2026-08-18T09:02:00.000Z',
    payload: {
      repository,
      lane_id: 'lane-task-4',
      issues: [101],
      operations: ['merge'],
      squash_method: 'squash',
      approved_at: '2026-08-18T09:02:00.000Z',
    },
  };
}

test('producer: source selection filters deferred rejected and duplicate candidates while retaining registered and direct issues', () => {
  // Given
  const candidates = sourceCandidates();

  // When
  const source = createSourceSelectionFromIssueCandidates(candidates);

  // Then
  assert.deepEqual(source.issues.map((issue) => [issue.issue_number, issue.source]), [[101, 'registered'], [105, 'direct']]);
  assert.equal(source.event, 'source.selected');
  assert.equal(Object.isFrozen(source), true);
});

test('producer: guarded create consumes the exact source selection and starts without destructive authority', async (context) => {
  // Given
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-4-create-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  const source = createSourceSelectionFromIssueCandidates(sourceCandidates());
  const receipt = laneCreated(source);

  // When
  const ledger = createStoredLaneFromSourceSelection(store, receipt, source);

  // Then
  assert.equal(ledger.version, 1);
  assert.equal(ledger.revision, 1);
  assert.equal(ledger.projection.authority, null);
  assert.deepEqual(Object.values(ledger.projection.items).map((item) => item.issue_number), [101, 105]);
  store.close();
});

test('producer: guarded create rejects missing or mismatched source and duplicate lane IDs without persistence changes', async (context) => {
  // Given
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-4-rejections-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  const source = createSourceSelectionFromIssueCandidates(sourceCandidates());
  const receipt = laneCreated(source);

  // When / Then
  assert.throws(() => createStoredLaneFromSourceSelection(store, receipt, undefined), assertCode('ERR_INVALID_RECEIPT'));
  assert.throws(() => createStoredLaneFromSourceSelection(store, receipt, { ...source, repository: 'other/repository' }), assertCode('ERR_INVALID_RECEIPT'));
  const created = createStoredLaneFromSourceSelection(store, receipt, source);
  assert.throws(() => createStoredLaneFromSourceSelection(store, receipt, source), assertCode('ERR_REVISION_CONFLICT'));
  assert.deepEqual(validateStoredLane(store, receipt.lane_id), created);
  store.close();
});

test('producer: authority remains absent until the dedicated authorize operation appends an exact one-lane receipt', async (context) => {
  // Given
  const root = await mkdtemp(join(tmpdir(), 'ilokesto-task-4-authorize-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = openTestLedgerStore(root);
  const source = createSourceSelectionFromIssueCandidates(sourceCandidates());
  createStoredLaneFromSourceSelection(store, laneCreated(source), source);
  const authority = authorityReceipt();

  // When / Then
  assert.throws(() => transitionStoredLane(store, authority), assertCode('ERR_ILLEGAL_TRANSITION'));
  assert.equal(validateStoredLane(store, authority.lane_id).projection.authority, null);
  const authorized = authorizeTestStoredLane(store, authority);
  assert.equal(authorized.revision, 2);
  assert.deepEqual(authorized.projection.authority, {
    repository,
    lane_id: 'lane-task-4',
    issues: [101],
    operations: ['merge'],
    consumed_operations: [],
    receipt_id: 'authority-task-4',
  });
  store.close();
});

test('producer commands expose only canonical source create and approval-gated authorize structures', async () => {
  // Given
  const [searchIssue, createLane, cli, configText] = await Promise.all([
    readFile(new URL('../../.opencode/commands/search-issue.md', import.meta.url), 'utf8'),
    readFile(new URL('../../.opencode/commands/create-lane.md', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/workflow/lane-ledger-cli.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../.opencode/opencode.json', import.meta.url), 'utf8'),
  ]);
  const bashPermissions = JSON.parse(configText).permission.bash;

  // When / Then
  const sourceSelectionBlock = searchIssue.match(/```source-selection-contract\n([\s\S]*?)\n```/u);
  assert.ok(sourceSelectionBlock, 'search-issue must document a machine-readable source.selected contract');
  const documentedSourceSelection = JSON.parse(sourceSelectionBlock[1]);
  assert.deepEqual(Object.keys(documentedSourceSelection), ['version', 'handoff_id', 'event', 'repository', 'created_at', 'issues']);
  assert.equal(documentedSourceSelection.event, 'source.selected');
  assert.equal('candidate_dispositions' in documentedSourceSelection, false);
  assert.doesNotMatch(sourceSelectionBlock[1], /\b(?:candidate_dispositions|deferred|rejected|duplicate)\b/u);
  for (const field of ['version', 'handoff_id', 'event', 'repository', 'created_at', 'issues', 'issue_number', 'issue_url', 'source', 'approval', 'provenance']) assert.match(searchIssue, new RegExp(`\\b${field}\\b`, 'u'));
  for (const disposition of ['registered', 'deferred', 'rejected', 'duplicate', 'direct']) assert.match(searchIssue, new RegExp(`\\b${disposition}\\b`, 'u'));
  assert.match(createLane, /lane-ledger-cli\.mjs create <lane-id> \.omo\/inbox\/<receipt>\.json/u);
  assert.match(createLane, /validateLaneCreationFromSourceSelection/u);
  assert.match(createLane, /hard_dependencies/u);
  assert.match(createLane, /ordering_after/u);
  assert.match(createLane, /lane-ledger-cli\.mjs authorize <lane-id> --expected-revision <revision> --repository <owner\/name> --issues <one-issue-number-or-empty> --operations <one-operation> --squash-method squash/u);
  assert.match(cli, /case 'authorize'/u);
  assert.equal(bashPermissions['node scripts/workflow/lane-ledger-cli.mjs authorize *'], 'ask');
  assert.ok(Object.keys(bashPermissions).indexOf('node scripts/workflow/lane-ledger-cli.mjs authorize *') > Object.keys(bashPermissions).indexOf('*'));
  assert.equal(bashPermissions['gh issue create*'], 'deny');
  assert.ok(Object.keys(bashPermissions).indexOf('gh issue create*') > Object.keys(bashPermissions).indexOf('*'));
  assert.equal(bashPermissions['node scripts/workflow/supervisor-boundary.mjs issue-create * .omo/inbox/* .omo/inbox/*'], 'ask');
});
