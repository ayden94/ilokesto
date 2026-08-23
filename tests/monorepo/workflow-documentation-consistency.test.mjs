import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

const root = join(import.meta.dirname, '..', '..');
const commandDirectory = join(root, '.opencode', 'commands');
const skillDirectory = join(root, '.opencode', 'skills');
const agentDirectory = join(root, '.opencode', 'agents');
const workflowCommands = ['search-issue', 'create-lane', 'execute-lane', 'issue-to-pr', 'pr-to-merge'];
const reviewerAgents = ['contract', 'code', 'verification', 'docs-release'];
const allReviewerAgents = [...reviewerAgents, 'issue-registration'];
const handbookFiles = [
  'AGENTS.md',
  'COMMANDS.md',
  '.opencode/VALIDATION.md',
  '.opencode/agents/README.md',
  '.opencode/skills/ilokesto-ecosystem-map/SKILL.md',
  '.opencode/skills/ilokesto-worktree-governance/SKILL.md',
];
const legacyVerdicts = /approve\s*\|\s*block\s*\|\s*needs-human-check|(?:^|\n)\s*verdict\s*:\s*(?:approve|block|needs-human-check)\b/iu;
const transitionTableHeader = /\|\s*Event\s*\/\s*outcome\s*\|\s*From\s*\|\s*To\s*\|\s*Sole\s+producer\s*\|\s*Required\s+proof\s*\|/iu;
const platformPolicy = {
  linux: 'Linux opens `workspace/.omo/lanes/.locks` descriptor-relatively through `/proc/self/fd` and fstats targets.',
  darwin: 'Darwin uses the verified identity-bound `bound-path` strategy because directory traversal through `/dev/fd` is unavailable.',
  failClosed: 'Unsupported platforms fail closed.',
};

async function names(directory, suffix = '') {
  return (await readdir(directory)).filter((name) => name.endsWith(suffix));
}

async function actualInputs() {
  const allCommandNames = await names(commandDirectory, '.md');
  const skillNames = await names(skillDirectory);
  const handbook = await Promise.all(handbookFiles.map((path) => readFile(join(root, path), 'utf8')));
  const commands = await Promise.all(workflowCommands.map((name) => readFile(join(commandDirectory, `${name}.md`), 'utf8')));
  const governance = await readFile(join(skillDirectory, 'ilokesto-workflow-governance', 'SKILL.md'), 'utf8');
  const validation = await readFile(join(root, '.opencode/VALIDATION.md'), 'utf8');
  return { commandNames: workflowCommands, allCommandNames: allCommandNames.map((name) => name.slice(0, -3)), skillNames, handbook, commands, governance, validation };
}

function checkDocumentation({ commandNames, allCommandNames = commandNames, skillNames, handbook, commands, governance }) {
  const allDocs = [...handbook, ...commands, governance];
  for (const command of allCommandNames) assert.equal(skillNames.includes(command), false, `${command} shadows a skill`);
  for (const command of workflowCommands) {
    const source = commands[commandNames.indexOf(command)];
    assert.ok(source, `${command} command is missing`);
    assert.match(source, /^agent: ilokesto-workflow-supervisor$/mu, command);
  }
  for (const source of allDocs) {
    assert.match(source, /ilokesto-workflow-governance/u, 'workflow SSOT reference missing');
    assert.doesNotMatch(source, legacyVerdicts, 'legacy verdict output found');
    assert.doesNotMatch(source, /(?:write|edit)\s+(?:the\s+)?ledger JSON(?!\s+directly)/iu, 'direct ledger edit instruction found');
    assert.doesNotMatch(source, /lane-ledger-path|status\s*:\s*pending/iu, 'stale caller path or state found');
  }
  const tableCount = allDocs.reduce((count, source) => count + (source.match(transitionTableHeader) ?? []).length, 0);
  assert.equal(tableCount, 1, 'exactly one complete transition table must exist');
  assert.ok(transitionTableHeader.test(governance), 'workflow governance table is missing');
}

test('platform policy has one governance source and consistent committed validation references', async () => {
  const { governance, validation } = await actualInputs();
  for (const policy of Object.values(platformPolicy)) {
    assert.equal(governance.split(policy).length - 1, 1, `governance must state policy once: ${policy}`);
  }
  assert.match(validation, /ilokesto-workflow-governance.*Linux.*\/proc\/self\/fd.*Darwin.*bound-path.*fail closed/isu);
  assert.match(governance, /revalidates realpath, type, device, and inode before every critical operation/iu);
  assert.match(governance, /one `renameSync\(temporary, target\)` as the sole commit point/iu);
  assert.match(governance, /pre-checks do not eliminate a hostile insertion in the final userspace-to-rename interval/iu);
  assert.match(governance, /canonical lock is a fully initialized regular file/iu);
  assert.match(governance, /publishes the canonical name with one no-clobber hard link/iu);
});

test('repository documentation and active workflow commands satisfy one shared checker', async () => {
  checkDocumentation(await actualInputs());
});

test('every custom role declares a provider-qualified model', async () => {
  for (const name of await names(agentDirectory, '.md')) {
    if (name === 'README.md') continue;
    const source = await readFile(join(agentDirectory, name), 'utf8');
    assert.match(source, /^model: [a-z0-9-]+\/[a-z0-9.-]+$/mu, name);
  }
});

test('negative fixtures use the shared checker for duplicate tables and command/skill shadowing', async (context) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'ilokesto-task-10-'));
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const real = await actualInputs();
  const duplicate = `${real.handbook[1]}\n| Event / outcome | From | To | Sole producer | Required proof |\n|---|---|---|---|---|`;
  assert.throws(() => checkDocumentation({ ...real, handbook: [duplicate, ...real.handbook.slice(1)] }), /exactly one complete transition table/u);
  await writeFile(join(fixtureRoot, 'search-issue'), '');
  assert.throws(() => checkDocumentation({ ...real, skillNames: [...real.skillNames, 'search-issue'] }), /shadows a skill/u);
});

test('pr-to-merge documents the exact review receipt payload and recovery tuples', async () => {
  const source = await readFile(join(commandDirectory, 'pr-to-merge.md'), 'utf8');
  const contract = JSON.parse(source.match(/```workflow-command-contract\n([\s\S]*?)\n```/u)?.[1]);
  assert.deepEqual(contract.reviewer_roles, {
    base: ['contract', 'code', 'verification'],
    conditional: { docs_release: 'docs_release_required' },
  });
  assert.match(source, /docs_release_required: false[\s\S]*?reviewers:[\s\S]*?verification:[^\n]+\n\s+blocker_signatures:/u);
  assert.match(source, /docs_release_required: true[\s\S]*?reviewers:[\s\S]*?docs_release:/u);
  for (const field of ['status', 'receipt_id', 'evidence_sha256', 'artifact_basename']) assert.match(source, new RegExp(`\\b${field}\\b`, 'u'));
  assert.match(source, /blocker_signatures:/u);
  assert.doesNotMatch(source, /\n\s*blockers:/u);
  assert.match(source, /merge:[^\n]*blocker_signatures \[\][^\n]*fix_back_eligible false[^\n]*remaining_fix_back_attempts 0[^\n]*non_fixable_evidence \[\]/u);
  assert.match(source, /block:[^\n]*blocker_signatures \[<at least one signature>\][^\n]*fix_back_eligible true[^\n]*remaining_fix_back_attempts <positive integer>[^\n]*non_fixable_evidence \[\]/u);
  assert.match(source, /needs-human-check:[^\n]*blocker_signatures \[\][^\n]*fix_back_eligible false[^\n]*remaining_fix_back_attempts 0[^\n]*non_fixable_evidence \[<at least one evidence reference>\]/u);
});

test('all review agents emit the canonical reviewer evidence contract directly', async () => {
  for (const role of reviewerAgents) {
    const source = await readFile(join(agentDirectory, `ilokesto-${role}-reviewer.md`), 'utf8');
    const output = source.match(/## Output\n\n(?:[^`]*?)```yaml\n([\s\S]*?)\n```/u)?.[1];
    assert.ok(output, `${role} reviewer output schema is missing`);
    assert.match(output, /^status: PASS \| BLOCK \| NEEDS_HUMAN_CHECK$/mu, role);
    for (const field of ['receipt_id', 'evidence_sha256', 'artifact_basename', 'findings']) {
      assert.match(output, new RegExp(`^${field}:`, 'mu'), `${role} missing ${field}`);
    }
    assert.doesNotMatch(output, /^verdict:/mu, role);
  }
});

test('all reviewers document evidence-only behavior without local repository execution', async () => {
  for (const role of allReviewerAgents) {
    const source = await readFile(join(agentDirectory, `ilokesto-${role}-reviewer.md`), 'utf8');
    assert.match(source, /exact current-head CI checks/iu, role);
    assert.match(source, /canonical worker verification receipts and evidence/iu, role);
    assert.match(source, /do not execute repository-controlled (?:code|scripts) locally/iu, role);
  }
  for (const role of reviewerAgents) {
    const source = await readFile(join(agentDirectory, `ilokesto-${role}-reviewer.md`), 'utf8');
    assert.match(source, /missing or stale required evidence[^\n]*BLOCK/iu, role);
  }
  const [agentReadme, validation, prToMerge] = await Promise.all([
    readFile(join(agentDirectory, 'README.md'), 'utf8'),
    readFile(join(root, '.opencode', 'VALIDATION.md'), 'utf8'),
    readFile(join(commandDirectory, 'pr-to-merge.md'), 'utf8'),
  ]);
  for (const [name, source] of Object.entries({ agentReadme, validation, prToMerge })) {
    assert.match(source, /exact current-head CI/iu, name);
    assert.match(source, /canonical worker verification receipts and evidence/iu, name);
    assert.match(source, /BLOCK/iu, name);
  }
  assert.doesNotMatch(agentReadme, /'pnpm --filter [^']+': allow/u);
});
