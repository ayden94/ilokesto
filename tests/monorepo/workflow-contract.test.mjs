import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const commandsDirectory = join(repositoryRoot, '.opencode', 'commands');
const skillsDirectory = join(repositoryRoot, '.opencode', 'skills');

const itemStates = [
  'queued', 'dispatching', 'implementing', 'implementation-complete', 'pr-open',
  'in-review', 'fix-back-pending', 'fix-back', 'merge-ready', 'merged',
  'cleanup-pending', 'done', 'release-handoff', 'blocked-child-contract-error',
  'blocked-ledger-conflict', 'blocked-retry-exhausted', 'blocked-maintainer-decision',
  'blocked-dirty-worktree', 'needs-human-check-terminal',
];
const workflowStates = ['ready', 'running', 'done', 'blocked-terminal'];
const receiptFields = [
  'version', 'receipt_id', 'event', 'lane_id', 'item_id', 'attempt', 'dispatch_id',
  'producer', 'expected_revision', 'repository', 'base_branch', 'created_at', 'payload',
];
const operationErrors = [
  'ERR_UNSUPPORTED_VERSION', 'ERR_INVALID_SCHEMA', 'ERR_ILLEGAL_TRANSITION',
  'ERR_PROJECTION_DRIFT', 'ERR_DUPLICATE_RECEIPT', 'ERR_REVISION_CONFLICT',
  'ERR_LOCK_BUSY', 'ERR_STALE_LOCK', 'ERR_PATH_OUTSIDE_ROOT', 'ERR_PATH_SYMLINK',
  'ERR_INVALID_TARGET_TYPE', 'ERR_INVALID_RECEIPT', 'ERR_STALE_HEAD',
  'ERR_AUTHORITY_MISSING', 'ERR_AUTHORITY_MISMATCH', 'ERR_AUTHORITY_CONSUMED',
  'ERR_SIDE_EFFECT_PRECONDITION', 'ERR_FORBIDDEN_DATA',
];
const transitionRows = [
  ['lane.created', 'absent', 'queued', 'supervisor create operation', 'approved source selection, repository/base identity'],
  ['workflow.started', 'workflow ready', 'workflow running', 'supervisor', 'valid replay, no conflicting writer lock'],
  ['item.dispatched', 'queued', 'dispatching', 'supervisor', 'dependencies merged and base SHA contains required merge SHAs'],
  ['worker.started', 'dispatching', 'implementing', 'supervisor from dispatch receipt', 'dispatch/item/attempt/worktree identity'],
  ['worker.completed', 'implementing or fix-back', 'implementation-complete', 'supervisor after verifying child receipt', 'commit SHA, changed files, verification receipts, current attempt'],
  ['pr.opened or pr.updated', 'implementation-complete', 'pr-open', 'supervisor', 'exact PR number, branch, current head SHA, issue linkage'],
  ['review.started', 'pr-open', 'in-review', 'supervisor', 'current PR head/check identities'],
  ['review.completed: merge', 'in-review', 'merge-ready', 'supervisor after all reviewers', 'every required reviewer PASS and checks PASS at current head'],
  ['review.completed: block', 'in-review', 'fix-back-pending', 'supervisor', 'fixable stable blocker signatures and remaining retry budget'],
  ['review.completed: needs-human-check', 'in-review', 'needs-human-check-terminal', 'supervisor', 'non-fixable policy/security/scope evidence'],
  ['evidence.invalidated', 'pr-open or in-review', 'pr-open', 'supervisor reconciliation', 'changed live head SHA and identities of superseded review/check receipts'],
  ['fix_back.started', 'fix-back-pending', 'fix-back', 'supervisor', 'same PR/branch/worktree, incremented attempt, exact blockers'],
  ['merge.completed', 'merge-ready', 'merged', 'authority-gated merge wrapper', 'live head/check revalidation, squash merge SHA, matching authority'],
  ['cleanup.started', 'merged', 'cleanup-pending', 'supervisor', 'confirmed merged PR and command-owned worktree baseline'],
  ['cleanup.completed or cleanup.skipped', 'cleanup-pending', 'done', 'authority-gated cleanup wrapper or supervisor skip', 'cleanup receipt or explicit skipped-authority receipt'],
  ['cleanup.blocked', 'cleanup-pending', 'blocked-dirty-worktree', 'cleanup wrapper', 'tracked/untracked baseline conflict evidence'],
  ['release_handoff.created', 'queued', 'release-handoff', 'supervisor', 'immutable non-authorizing readiness payload'],
  ['authority.granted', 'authority absent', 'authority present/unconsumed; no item-state change', 'dedicated native-approval-gated authorize operation', 'exact repository/lane/issues/operations, squash method, approval timestamp'],
  ['root_sync.completed or root_sync.skipped', 'all items done or release-handoff; root sync pending', 'root sync terminal; no item-state change', 'authority-gated root-sync wrapper or supervisor skip', 'consumed matching authority plus ff-only SHA, or explicit skipped-authority reason'],
  ['root_sync.blocked', 'all items done or release-handoff; root sync pending', 'workflow blocked-terminal', 'root-sync wrapper', 'dirty root, non-ff, or external identity evidence'],
  ['item.blocked', 'any non-terminal item state', 'one stable terminal error state', 'supervisor/guarded wrapper', 'stable error code and evidence'],
  ['workflow.completed', 'workflow running', 'workflow done', 'supervisor', 'every item is done or release-handoff, root sync is completed or skipped, and no stale/pending evidence'],
  ['workflow.blocked', 'workflow running', 'workflow blocked-terminal', 'supervisor', 'at least one terminal error item and no runnable recovery'],
];
const terminalStates = itemStates.slice(13);
const primaryItemStates = itemStates.slice(0, 13);
const canonicalTransitionRows = transitionRows.map((row) => row.map((cell) => cell.replace(/^item ([^;]+); workflow .+$/, '$1').replace(/^workflow /, '')));
const eventHeads = [...new Set(canonicalTransitionRows.flatMap(([event]) => event.split(' or ').map((name) => name.replace(/: (merge|block|needs-human-check)$/, ''))))];

function readSkill() {
  const skillPath = join(skillsDirectory, 'ilokesto-workflow-governance', 'SKILL.md');
  assert.equal(existsSync(skillPath), true, 'workflow governance skill is missing');
  return readFileSync(skillPath, 'utf8');
}

function parseContract(skill) {
  const statesSection = skill.match(/## Canonical States\n\n([\s\S]*?)\n## Canonical Transition Contract/);
  const primarySection = statesSection?.[1].match(/The version 1 item states are:\n\n([^\n]+)/)?.[1];
  const terminalSection = statesSection?.[1].match(/Stable persisted terminal item states are:\n\n([^\n]+)/)?.[1];
  const workflowSection = statesSection?.[1].match(/Workflow states are exactly ([^\.]+)\./)?.[1];
  const receiptSection = skill.match(/Every receipt has this envelope:\n\n([^\n]+)/)?.[1];
  const errorSection = skill.match(/The stable non-persisting operation errors are exactly:\n\n([^\n]+)/)?.[1];
  const table = skill.match(/\| Event \/ outcome \| From \| To \| Sole producer \| Required proof \|\n\| --- \| --- \| --- \| --- \| --- \|\n([\s\S]*?)\n\n/);
  assert.ok(statesSection && primarySection && terminalSection && workflowSection && receiptSection && errorSection && table, 'contract sections are complete');
  const values = (line) => [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  const rows = table[1].trimEnd().split('\n').map((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replaceAll('`', '').replace(/^item ([^;]+); workflow .+$/, '$1').replace(/^workflow /, ''));
    assert.equal(cells.length, 5, 'transition row has five cells');
    return cells;
  });
  return {
    version: /Version 1 is the first and only supported ilokesto ledger version/.test(skill) ? 1 : null,
    itemStates: [...values(primarySection), ...values(terminalSection)],
    primaryItemStates: values(primarySection),
    terminalStates: values(terminalSection),
    workflowStates: values(workflowSection),
    receiptFields: values(receiptSection),
    operationErrors: values(errorSection),
    transitionRows: rows,
    aliases: skill.match(/Accepted state\/verdict aliases: ([^\.]+)\./)?.[1] ?? null,
  };
}

function assertContractShape(contract) {
  assert.equal(contract.version, 1);
  assert.deepEqual(contract.primaryItemStates, primaryItemStates);
  assert.deepEqual(contract.terminalStates, terminalStates);
  assert.deepEqual(contract.itemStates, itemStates);
  assert.deepEqual(contract.workflowStates, workflowStates);
  assert.deepEqual(contract.receiptFields, receiptFields);
  assert.deepEqual(contract.operationErrors, operationErrors);
  assert.deepEqual(contract.transitionRows, canonicalTransitionRows);
  assert.equal(contract.aliases, 'none');
  assert.equal(new Set(contract.itemStates).size, itemStates.length);
  assert.equal(new Set(contract.workflowStates).size, workflowStates.length);
  assert.equal(new Set(contract.receiptFields).size, receiptFields.length);
  assert.equal(new Set(contract.operationErrors).size, operationErrors.length);
  assert.equal(new Set(contract.transitionRows.map((row) => row.join('|'))).size, canonicalTransitionRows.length);
}

function hasPositiveAliasDeclaration(content) {
  return content.split('\n').some((line) => {
    if (!/\bapprove(?:d)?\b/i.test(line) || !/\b(?:supported|accepted|allowed)\b/i.test(line)) return false;
    return !/\bnot\s+(?:supported|accepted|allowed)\b/i.test(line) && !/Accepted state\/verdict aliases:\s*none\b/i.test(line);
  });
}

function hasPositivePauseDeclaration(content) {
  return /\bpaused\b|workflow\.paused/i.test(content);
}

function hasAlternativeWorkflowContract(content) {
  return hasPositiveAliasDeclaration(content) || hasPositivePauseDeclaration(content) || eventHeads.every((head) => content.includes(head));
}

function validateCanonicalSkill(skill) {
  assertContractShape(parseContract(skill));
  assert.equal(hasPositiveAliasDeclaration(skill), false);
  assert.equal(hasPositivePauseDeclaration(skill), false);
}

test('baseline command vocabulary remains commands without same-name skills', () => {
  const commandNames = ['search-issue', 'create-lane', 'execute-lane', 'issue-to-pr', 'pr-to-merge'];
  const commandFiles = new Set(readdirSync(commandsDirectory));
  const skillNames = new Set(readdirSync(skillsDirectory));

  for (const commandName of commandNames) {
    assert.equal(commandFiles.has(`${commandName}.md`), true, `missing command ${commandName}`);
    assert.equal(skillNames.has(commandName), false, `skill shadows command ${commandName}`);
  }
});

test('skill is the exact independent workflow contract', () => {
  const skill = readSkill();
  assert.match(skill, /name: ilokesto-workflow-governance/);
  validateCanonicalSkill(skill);
  assert.match(skill, /hard dependencies.*base SHA/i);
  assert.match(skill, /three fix-back attempts/i);
  assert.match(skill, /authority\.granted.*forbidden.*general transition operation/is);
  assert.match(skill, /session-free.*repository-relative/i);
  assert.match(skill, /no pause state or pause transition/);
  assert.match(skill, /minimal pending-item schemas.*legacy synonyms are not supported inputs/is);

  const otherSkills = readdirSync(skillsDirectory).filter((name) => name !== 'ilokesto-workflow-governance');
  for (const name of otherSkills) {
    const path = join(skillsDirectory, name, 'SKILL.md');
    if (existsSync(path)) {
      const other = readFileSync(path, 'utf8');
      assert.equal(hasAlternativeWorkflowContract(other), false, `second SSOT in ${name}`);
    }
  }
});

test('mutated contracts are rejected by the parser', () => {
  const mutations = {
    duplicate_transition_row: (skill) => skill.replace('| `workflow.blocked` |', '| `workflow.completed` | workflow `running` | workflow `done` | supervisor | duplicate |\n| `workflow.blocked` |'),
    extra_pause_state_and_transition: (skill) => skill.replace('`blocked-terminal`.', '`blocked-terminal`, `paused`.').replace('| `workflow.started` |', '| `workflow.paused` | workflow `running` | workflow `paused` | supervisor | pause proof |\n| `workflow.started` |'),
    positive_accepted_alias: (skill) => skill.replace('Accepted state/verdict aliases: none.', 'Accepted state/verdict aliases: approve.'),
    missing_receipt_field: (skill) => skill.replace('`expected_revision`, ', ''),
    missing_transition_row: (skill) => skill.replace('| `workflow.blocked` | workflow `running` | workflow `blocked-terminal` | supervisor | at least one terminal error item and no runnable recovery |\n', ''),
    duplicate_row: (skill) => skill.replace('| `workflow.blocked` |', '| `workflow.completed` | workflow `running` | workflow `done` | supervisor | duplicate |\n| `workflow.blocked` |'),
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    assert.throws(() => assertContractShape(parseContract(mutate(readSkill()))), name);
  }
});

test('actual-source global mutations are rejected', () => {
  const otherSkillPath = join(skillsDirectory, 'ilokesto-worktree-governance', 'SKILL.md');
  const otherSkill = readFileSync(otherSkillPath, 'utf8');
  const eventList = eventHeads.join(', ');
  const mutations = {
    canonical_positive_alias_under_other_heading: `${readSkill()}\n## Legacy verdict note\nThe legacy verdict approve is a supported input.`,
    canonical_positive_pause_outside_sections: `${readSkill()}\nAdditional item state: paused. Additional transition: workflow.paused.`,
    positive_alias_under_other_heading: `${otherSkill}\n## Legacy verdict note\nThe legacy verdict approve is a supported input.`,
    positive_pause_outside_canonical_sections: `${otherSkill}\nAdditional item state: paused. Additional transition: workflow.paused.`,
    alternate_complete_event_set: `${otherSkill}\n## Event inventory\n${eventList}`,
  };
  assert.equal(hasPositiveAliasDeclaration(readSkill()), false);
  assert.equal(hasPositivePauseDeclaration(readSkill()), false);
  assert.throws(() => validateCanonicalSkill(mutations.canonical_positive_alias_under_other_heading));
  assert.throws(() => validateCanonicalSkill(mutations.canonical_positive_pause_outside_sections));
  assert.equal(hasAlternativeWorkflowContract(otherSkill), false);
  for (const [name, mutated] of Object.entries(mutations)) assert.equal(hasAlternativeWorkflowContract(mutated), true, name);
});
