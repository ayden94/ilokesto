import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const agentUrl = new URL('../../.opencode/agents/ilokesto-workflow-supervisor.md', import.meta.url);

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/u);
  assert.ok(match, 'supervisor frontmatter is required');
  return match[1];
}

function permissionEntries(source, section) {
  const lines = source.split('\n');
  const heading = lines.findIndex((line) => line === `  ${section}:`);
  assert.notEqual(heading, -1, `permission.${section} is required`);
  const entries = [];
  for (let index = heading + 1; index < lines.length; index += 1) {
    const singleQuoted = lines[index].match(/^    '([^']+)': (allow|ask|deny)$/u);
    const doubleQuoted = lines[index].match(/^    "((?:[^"\\]|\\.)+)": (allow|ask|deny)$/u);
    if (!lines[index].startsWith('    ')) break;
    assert.ok(singleQuoted || doubleQuoted, `permission.${section} contains an unsupported rule: ${lines[index]}`);
    if (singleQuoted) entries.push([singleQuoted[1], singleQuoted[2]]);
    if (doubleQuoted) entries.push([JSON.parse(`"${doubleQuoted[1]}"`), doubleQuoted[2]]);
  }
  return entries;
}

function globPattern(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`, 'u');
}

function resolvePermission(entries, input) {
  let result;
  for (const [pattern, action] of entries) {
    if (globPattern(pattern).test(input)) result = action;
  }
  return result;
}

test('supervisor grants orchestration tools and restricts edits to bounded workflow artifacts', async () => {
  const content = await readFile(agentUrl, 'utf8');
  const header = frontmatter(content);

  assert.match(header, /^description: ilokesto-workflow-supervisor /mu);
  assert.match(header, /^mode: subagent$/mu);
  assert.match(header, /^model: [a-z0-9-]+\/[a-z0-9.-]+$/mu);
  assert.match(header, /^  '\*': deny$/mu);
  for (const tool of ['read', 'grep', 'glob', 'list', 'skill']) {
    assert.match(header, new RegExp(`^  ${tool}: allow$`, 'mu'));
  }
  const tasks = permissionEntries(header, 'task');
  assert.deepEqual(tasks, [
    ['*', 'deny'],
    ['ilokesto-contract-reviewer', 'allow'],
    ['ilokesto-code-reviewer', 'allow'],
    ['ilokesto-verification-reviewer', 'allow'],
    ['ilokesto-docs-release-reviewer', 'allow'],
    ['ilokesto-issue-registration-reviewer', 'allow'],
  ]);
  assert.match(header, /^  question: allow$/mu);
  assert.doesNotMatch(header, /^permission: allow$/mu);

  const edits = permissionEntries(header, 'edit');
  assert.deepEqual(edits, [
    ['*', 'deny'],
    ['.omo/inbox/**', 'allow'],
    ['.omo/evidence/**', 'allow'],
    ['.omo/search-runs/**', 'allow'],
    ['.omo/plans/*.md', 'allow'],
    ['.omo/lanes/**', 'deny'],
    ['.omo/lanes/.locks/**', 'deny'],
  ]);
  for (const path of ['.omo/inbox/worker-101.json', '.omo/evidence/task-101.txt', '.omo/search-runs/run-101.json', '.omo/plans/workflow-ledger-handover.md']) {
    assert.equal(resolvePermission(edits, path), 'allow', path);
  }
  for (const path of [
    '.omo/lanes/lane-a.json',
    '.omo/lanes/.locks/lane-a.lock',
    '.omo/notepads/workflow-ledger-handover/learnings.md',
    '.omo/boulder.json',
    'packages/store/src/index.ts',
    'docs/index.md',
    'scripts/workflow/lane-ledger.mjs',
    '.opencode/commands/execute-lane.md',
  ]) {
    assert.equal(resolvePermission(edits, path), 'deny', path);
  }
});

test('supervisor bash rules preserve exact native ask gates and denial ordering', async () => {
  const header = frontmatter(await readFile(agentUrl, 'utf8'));
  const entries = permissionEntries(header, 'bash');
  assert.deepEqual(entries[0], ['*', 'deny']);

  const allowed = [
    'node scripts/workflow/lane-ledger-cli.mjs create lane-a .omo/inbox/lane-a-create.json',
    'node scripts/workflow/lane-ledger-cli.mjs transition lane-a --expected-revision 2 .omo/inbox/lane-a-transition.json',
    'node scripts/workflow/lane-ledger-cli.mjs validate lane-a',
    'node scripts/workflow/lane-ledger-cli.mjs project lane-a',
    'node scripts/workflow/implementer-launcher.mjs ilokesto-scoped-implementer .worktrees/issue-101-test .omo/inbox/worker-101.json',
    'node scripts/workflow/supervisor-boundary.mjs base-worktree ilokesto/ilokesto main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa issue-101-test .worktrees/issue-101-test',
    'node scripts/workflow/supervisor-boundary.mjs branch-push ilokesto/ilokesto issue-101-test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'node scripts/workflow/supervisor-boundary.mjs pr-create ilokesto/ilokesto main issue-101-test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 101 .omo/inbox/pr-title.txt .omo/inbox/pr-body.md',
    'node scripts/workflow/supervisor-boundary.mjs pr-update ilokesto/ilokesto 101 main issue-101-test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 101 .omo/inbox/pr-title.txt .omo/inbox/pr-body.md',
    'git status --short',
    'git ls-remote origin refs/heads/main',
    'git worktree list --porcelain',
    'gh pr view 101 --json headRefOid',
    'gh search issues test --repo ilokesto/ilokesto',
  ];
  for (const command of allowed) assert.equal(resolvePermission(entries, command), 'allow', command);

  const asked = [
    'node scripts/workflow/lane-ledger-cli.mjs authorize lane-a --expected-revision 1',
    'node scripts/workflow/workflow-side-effect.mjs merge lane-a issue-101 --expected-revision 9 --authority-receipt authority-1',
    'node scripts/workflow/workflow-side-effect.mjs cleanup lane-a issue-101 --expected-revision 11 --authority-receipt authority-1',
    'node scripts/workflow/workflow-side-effect.mjs root-sync lane-a --expected-revision 13 --authority-receipt authority-1',
    'node scripts/workflow/supervisor-boundary.mjs issue-create ilokesto/ilokesto .omo/inbox/issue-title.txt .omo/inbox/issue-body.md',
  ];
  for (const command of asked) assert.equal(resolvePermission(entries, command), 'ask', command);

  const denied = [
    'node -e process.exit(0)',
    'node scripts/other.mjs',
    'env node scripts/workflow/lane-ledger-cli.mjs validate lane-a',
    'gh api repos/ilokesto/ilokesto/pulls/101/merge -X PUT',
    'gh pr merge 101 --squash',
    'gh run rerun 123',
    'gh workflow run release.yml',
    'npm publish',
    'pnpm publish',
    'git push --force origin issue-101-test',
    'git push -u origin issue-101-test:main',
    'git push origin :main',
    'git push origin issue-101-test --delete main',
    'git push origin issue-101-test --mirror',
    'git push origin main',
    'git push origin issue-101-test main',
    'git push origin issue-101-test',
    'git reset --hard HEAD',
    'git rebase main',
    'git worktree remove .worktrees/issue-101-test',
    'git worktree add -b issue-101-test .worktrees/issue-101-test origin/main --force',
    'git worktree add -b issue-101-test .worktrees/issue-101-test/../../escape origin/main',
    'git branch -D issue-101-test',
    'git pull --ff-only origin main',
    'git fetch origin main',
    'git worktree add -b issue-101-test .worktrees/issue-101-test origin/main',
    'git diff --no-index /dev/null /etc/passwd',
    'git diff --no-index package.json pnpm-lock.yaml',
    'git diff --output=/tmp/workflow.diff HEAD',
    'git diff --output=workflow.diff HEAD',
    'git diff --output /tmp/workflow.diff HEAD',
    'git diff --ext-diff HEAD',
    'git diff --textconv HEAD',
    'git diff /etc/passwd',
    'git diff -- /etc/passwd',
    'git diff ../outside-secret',
    'git diff -- ../outside-secret',
    'gh pr create --head issue-101-test --base main --title test --body-file .omo/inbox/pr.md',
    'gh pr edit 101 --body-file .omo/inbox/pr.md',
    'node scripts/workflow/supervisor-boundary.mjs pr-create ilokesto/ilokesto main issue-101-test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 101 .omo/inbox/pr-title.txt .omo/inbox/pr-body.md --draft',
    'node scripts/workflow/supervisor-boundary.mjs branch-push ilokesto/ilokesto issue-101-test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa main',
    'node scripts/workflow/supervisor-boundary.mjs pr-create ilokesto/ilokesto main issue-101-test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 101 .omo/../../outside-secret .omo/inbox/pr-body.md',
    'node scripts/workflow/lane-ledger-cli.mjs create lane-a .omo/inbox/../../outside-secret.json',
    'node scripts/workflow/lane-ledger-cli.mjs validate lane-a > result.json',
  ];
  for (const command of denied) assert.equal(resolvePermission(entries, command), 'deny', command);
});

test('supervisor prompt keeps ledger writes local and wrapper authority non-delegable', async () => {
  const content = await readFile(agentUrl, 'utf8');
  assert.match(content, /sole ledger writer/iu);
  assert.match(content, /never delegate ledger writes/iu);
  assert.match(content, /matching unconsumed authority/iu);
  assert.match(content, /workflow-side-effect\.mjs/iu);
  assert.match(content, /must not publish|never publish/iu);
});
