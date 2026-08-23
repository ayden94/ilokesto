#!/usr/bin/env node

import {
  LaneLedgerError,
  authorizeRuntimeStoredLane,
  createStoredLaneFromSourceSelection,
  discoverWorkspaceRoot,
  openRuntimeLedgerStore,
  projectStoredLane,
  transitionStoredLane,
  validateLaneCreationFromSourceSelection,
  validateLaneId,
  validateReceipt,
  validateSourceSelectionHandoff,
  validateStoredLane,
} from './lane-ledger.mjs';
import { readCanonicalInboxJson } from './canonical-inbox.mjs';
import { parsePositiveSafeInteger } from './issue-branch.mjs';

function failUsage(message) {
  throw new LaneLedgerError('ERR_INVALID_SCHEMA', message);
}

function parseArguments(argv) {
  const [operation, laneId, ...rawArgs] = argv;
  if (!['create', 'transition', 'authorize', 'validate', 'project'].includes(operation)) failUsage('operation must be create, transition, authorize, validate, or project');
  validateLaneId(laneId);
  if (rawArgs.includes('--root')) failUsage('caller-selected paths are forbidden');
  const receiptPath = operation === 'create'
    ? rawArgs[0]
    : operation === 'transition'
      ? rawArgs.at(-1)
      : null;
  const args = operation === 'create'
    ? rawArgs.slice(1)
    : operation === 'transition'
      ? rawArgs.slice(0, -1)
      : rawArgs;
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!['--expected-revision', '--repository', '--issues', '--operations', '--squash-method'].includes(flag) || value === undefined) failUsage(`unsupported argument: ${String(flag)}`);
    if (Object.hasOwn(options, flag)) failUsage(`duplicate argument: ${flag}`);
    options[flag] = value;
  }
  if (operation === 'create' && (args.length > 0 || receiptPath === undefined)) failUsage('create requires one direct .omo/inbox receipt file');
  if (operation === 'transition' && (!/^\d+$/u.test(options['--expected-revision'] ?? '') || receiptPath === undefined)) failUsage('transition requires --expected-revision and one direct .omo/inbox receipt file');
  if (operation === 'transition' && Object.keys(options).length !== 1) failUsage('transition accepts only --expected-revision');
  if (operation === 'authorize') {
    const required = ['--expected-revision', '--repository', '--issues', '--operations', '--squash-method'];
    if (!required.every((flag) => Object.hasOwn(options, flag)) || Object.keys(options).length !== required.length) failUsage(`authorize requires ${required.join(', ')}`);
    if (!/^\d+$/u.test(options['--expected-revision'])) failUsage('authorize expected revision must be a non-negative integer');
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(options['--repository'])) failUsage('authorize repository must be owner/name');
    if (options['--squash-method'] !== 'squash') failUsage('authorize squash method must be squash');
    const operations = options['--operations'].split(',');
    const issues = options['--issues'] === '' ? [] : options['--issues'].split(',');
    if (operations.length !== 1 || !['merge', 'cleanup', 'root-sync'].includes(operations[0])) failUsage('authorize must name exactly one operation');
    if (operations[0] === 'root-sync' ? issues.length !== 0 : issues.length !== 1 || parsePositiveSafeInteger(issues[0]) === null) failUsage('authorize issue scope does not match its operation');
  }
  if ((operation === 'validate' || operation === 'project') && args.length > 0) failUsage(`${operation} accepts only a lane ID`);
  return {
    operation,
    laneId,
    expectedRevision: options['--expected-revision'] === undefined ? null : Number(options['--expected-revision']),
    repository: options['--repository'] ?? null,
    issues: options['--issues'] === undefined ? null : options['--issues'] === '' ? [] : options['--issues'].split(',').map((value) => parsePositiveSafeInteger(value)),
    operations: options['--operations']?.split(',') ?? null,
    squashMethod: options['--squash-method'] ?? null,
    receiptPath,
  };
}

function execute(command) {
  const workspace = discoverWorkspaceRoot();
  let receipt = null;
  let sourceSelection = null;
  let sourceSelectionPresent = false;
  if (command.operation === 'create') {
    const input = readCanonicalInboxJson(workspace, command.receiptPath);
    if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new LaneLedgerError('ERR_INVALID_RECEIPT', 'create input must be an object');
    sourceSelectionPresent = Object.keys(input).length === 2 && Object.hasOwn(input, 'lane_receipt') && Object.hasOwn(input, 'source_selection');
    receipt = sourceSelectionPresent ? input.lane_receipt : input;
    sourceSelection = sourceSelectionPresent ? input.source_selection : null;
  } else if (command.operation === 'transition') {
    receipt = readCanonicalInboxJson(workspace, command.receiptPath);
  }
  if (command.operation === 'create' || command.operation === 'transition') {
    validateReceipt(receipt);
    if (receipt.lane_id !== command.laneId) failUsage('receipt lane_id does not match CLI lane ID');
    if (command.operation === 'transition' && receipt.expected_revision !== command.expectedRevision) failUsage('receipt revision does not match CLI arguments');
  }
  const store = openRuntimeLedgerStore(workspace);
  try {
    switch (command.operation) {
      case 'create': {
        if (!sourceSelectionPresent) failUsage('create input must contain exactly lane_receipt and source_selection');
        validateSourceSelectionHandoff(sourceSelection);
        validateLaneCreationFromSourceSelection(receipt, sourceSelection);
        return createStoredLaneFromSourceSelection(store, receipt, sourceSelection);
      }
      case 'transition': {
        return transitionStoredLane(store, receipt);
      }
      case 'authorize': {
        return authorizeRuntimeStoredLane(store, command);
      }
      case 'validate': return validateStoredLane(store, command.laneId);
      case 'project': return projectStoredLane(store, command.laneId);
      default: failUsage('unreachable operation');
    }
  } finally {
    store.close();
  }
}

try {
  const command = parseArguments(process.argv.slice(2));
  const result = execute(command);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  if (error instanceof LaneLedgerError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
