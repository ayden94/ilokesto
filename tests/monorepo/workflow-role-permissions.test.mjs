import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import test from 'node:test';

const agentsDirectory = new URL('../../.opencode/agents/', import.meta.url);
const implementers = ['ilokesto-scoped-implementer', 'ilokesto-ui-implementer'];
const reviewers = [
  'ilokesto-code-reviewer',
  'ilokesto-contract-reviewer',
  'ilokesto-docs-release-reviewer',
  'ilokesto-issue-registration-reviewer',
  'ilokesto-verification-reviewer',
];
const roles = [...reviewers, ...implementers, 'ilokesto-workflow-supervisor'].sort();

function frontmatter(content, role) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/u);
  assert.ok(match, `${role} frontmatter is required`);
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

function scalarPermission(source, tool) {
  return source.match(new RegExp(`^  ${tool}: (allow|ask|deny)$`, 'mu'))?.[1];
}

function resolveEditAccess(header, projectRoot, requestedPath, editOverride) {
  const resolvedPath = posix.resolve(projectRoot, requestedPath);
  const relativePath = posix.relative(projectRoot, resolvedPath);
  const isExternal = relativePath === '..' || relativePath.startsWith('../') || posix.isAbsolute(relativePath);
  return isExternal ? scalarPermission(header, 'external_directory') : (editOverride ?? scalarPermission(header, 'edit'));
}

async function loadRole(role) {
  const content = await readFile(new URL(`${role}.md`, agentsDirectory), 'utf8');
  const header = frontmatter(content, role);
  return { content, header, bash: permissionEntries(header, 'bash') };
}

const packageCommands = {
  'ilokesto-scoped-implementer': {
    store: ['build', 'typecheck', 'test'],
    state: ['build', 'typecheck', 'test', 'test:typecheck'],
    form: ['build', 'typecheck', 'test', 'test:pack'],
    fetcher: ['build', 'typecheck', 'test', 'test:dist'],
  },
  'ilokesto-ui-implementer': {
    form: ['build', 'typecheck', 'test', 'test:pack'],
    overlay: ['build', 'typecheck', 'test'],
    modal: ['build', 'typecheck', 'test', 'test:e2e', 'test:a11y', 'test:pack', 'test:ci'],
    toast: ['build', 'typecheck', 'test'],
    utilinent: ['build', 'typecheck', 'test', 'typecheck:react19'],
  },
};

const deniedBypasses = [
  'env git push origin issue-1-test',
  'command git push origin issue-1-test',
  '/usr/bin/git push origin issue-1-test',
  'git -C . push origin issue-1-test',
  'git push origin issue-1-test:main',
  'git push origin +issue-1-test',
  'git push origin issue-1-test --force',
  'git push --force origin issue-1-test',
  'git push origin --delete issue-1-test',
  'git push --mirror origin',
  'git push --repo . origin issue-1-test',
  'git worktree add .worktrees/escape main',
  'git worktree remove .worktrees/issue-1-test',
  'git branch -D issue-1-test',
  'git merge main',
  'git reset --hard HEAD',
  'git rebase main',
  'gh api repos/ilokesto/ilokesto/issues/1 -X PATCH -f title=changed',
  'gh --repo ilokesto/ilokesto pr create --title changed',
  'gh pr merge 1 --squash',
  'gh pr edit 1 --title changed',
  'gh pr review 1 --approve',
  'gh issue create --title changed',
  'gh label create changed',
  'gh run rerun 1',
  'gh workflow run release.yml',
  'pnpm publish',
  'pnpm --filter @ilokesto/store exec sh -c whoami',
  'node -e process.exit(0)',
  'sh -c "git push origin issue-1-test"',
  'ln -s ../ .worktrees/link-to-root',
  'git status > result.txt',
  'git status|git push origin issue-1-test',
  'git status && git push origin issue-1-test',
  'git status & git push origin issue-1-test',
  'git status `git push origin issue-1-test`',
];

test('workflow roles are complete, provider-qualified, and deny runtime defaults', async () => {
  const names = (await readdir(agentsDirectory))
    .filter((name) => name.startsWith('ilokesto-') && name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort();
  assert.deepEqual(names, roles);
  for (const role of roles) {
    const { header } = await loadRole(role);
    assert.match(header, /^model: [a-z0-9-]+\/[a-z0-9.-]+$/mu, role);
    assert.match(header, /^  '\*': deny$/mu, role);
    assert.doesNotMatch(header, /^permission: allow$/mu, role);
    if (role !== 'ilokesto-workflow-supervisor') assert.match(header, /^  external_directory: deny$/mu, role);
  }
});

test('root implementer profiles deny mutation and direct execution capabilities', async () => {
  const assignedRoot = '/repo/.worktrees/issue-1-test';
  for (const role of implementers) {
    const { content, header, bash } = await loadRole(role);
    assert.equal(scalarPermission(header, 'edit'), 'deny', role);
    assert.equal(scalarPermission(header, 'external_directory'), 'deny', role);
    for (const path of ['packages/store/src/index.ts', '.changeset/task.md', '.worktrees/issue-2/file']) {
      assert.equal(resolveEditAccess(header, assignedRoot, path, 'allow'), 'allow', `${role}: assigned-local ${path}`);
    }
    for (const path of ['../issue-2/file', '../issue-2/../issue-2/file', '/repo/.worktrees/issue-2/file', '../../packages/store/src/index.ts', '/repo/packages/store/src/index.ts', '/tmp/.worktrees/issue-1-test/file']) {
      assert.equal(resolveEditAccess(header, assignedRoot, path, 'allow'), 'deny', `${role}: external ${path}`);
    }
    assert.equal(resolveEditAccess(header, '/repo', 'packages/store/src/index.ts'), 'deny', `${role}: direct root invocation`);
    assert.match(content, /assigned worktree|할당된 .*worktree/iu, role);
    for (const command of ['git add packages/store/src/index.ts', 'git commit -m test']) {
      assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    }
    for (const [packageName, scripts] of Object.entries(packageCommands[role])) {
      for (const script of scripts) {
        const command = `pnpm --filter @ilokesto/${packageName} ${script}`;
        assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
      }
    }
    for (const command of deniedBypasses) assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    for (const command of ['git add --all', 'git add -A', 'git commit -am test', 'git commit -m test -a', 'git commit -m test --all', 'git add .worktrees/sibling/README.md', 'git add ../main/README.md', 'git add -- ../main/README.md', 'git add /tmp/README.md', 'git add ~/README.md', 'git add $HOME/README.md', 'git add "$HOME/README.md"', 'git add ${HOME}/README.md']) {
      assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    }
  }
});

test('reviewers are edit-denied and expose only bounded evidence inspection', async () => {
  for (const role of reviewers) {
    const { header, bash } = await loadRole(role);
    assert.equal(scalarPermission(header, 'edit'), 'deny', role);
    for (const path of ['README.md', '.worktrees/issue-1-test/README.md', '../outside.md', '/tmp/outside.md']) {
      assert.equal(scalarPermission(header, 'edit'), 'deny', `${role}: ${path}`);
    }
    for (const command of ['git status --short', 'git diff main...HEAD', 'gh issue view 1', 'gh pr checks 1']) {
      assert.equal(resolvePermission(bash, command), 'allow', `${role}: ${command}`);
    }
    for (const broad of ['git *', 'gh api *', 'gh pr *', 'gh issue *', 'gh label *', 'pnpm *', 'node *', 'env *']) {
      assert.equal(bash.some(([pattern, action]) => pattern === broad && action === 'allow'), false, `${role}: ${broad}`);
    }
    assert.equal(bash.some(([pattern, action]) => action === 'allow' && (
      pattern === 'actionlint'
      || pattern === 'pnpm changeset status'
      || pattern.startsWith('pnpm --filter ')
    )), false, `${role}: repository-controlled verification commands must not be allowed`);
    for (const command of ['git add README.md', 'git commit -m changed']) {
      assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    }
    for (const command of deniedBypasses) assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    for (const command of [
      'git diff --no-index /dev/null /etc/passwd',
      'git diff --no-index package.json pnpm-lock.yaml',
      'git diff --output=/tmp/review.diff HEAD',
      'git diff --output review.diff HEAD',
      'git diff --ext-diff HEAD',
      'git diff --textconv HEAD',
      'git diff /etc/passwd',
      'git diff -- /etc/passwd',
      'git diff ../outside-secret',
      'git diff -- ../outside-secret',
    ]) assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
  }
});

test('reviewers deny local verification execution and supervisor remains the sole orchestrator', async () => {
  const localVerificationCommands = [
    'actionlint',
    'pnpm changeset status',
    ...Object.entries(packageCommands).flatMap(([, packages]) => Object.entries(packages).flatMap(
      ([packageName, scripts]) => scripts.map((script) => `pnpm --filter @ilokesto/${packageName} ${script}`),
    )),
  ];
  for (const role of reviewers) {
    const { bash } = await loadRole(role);
    for (const command of localVerificationCommands) {
      assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    }
  }
  for (const role of [...implementers, ...reviewers]) {
    const { bash } = await loadRole(role);
    for (const command of ['git worktree add -b issue-1-test .worktrees/issue-1-test origin/main', 'git push -u origin issue-1-test', 'gh pr create --head issue-1-test --base main --title test']) {
      assert.equal(resolvePermission(bash, command), 'deny', `${role}: ${command}`);
    }
  }
});

test('issue-to-pr binds implementers to a native child project root', async () => {
  const [issueToPr, supervisor] = await Promise.all([
    readFile(new URL('../../.opencode/commands/issue-to-pr.md', import.meta.url), 'utf8'),
    loadRole('ilokesto-workflow-supervisor'),
  ]);
  assert.match(issueToPr, /node scripts\/workflow\/implementer-launcher\.mjs ilokesto-scoped-implementer \.worktrees\/issue-<number>-<short-title> \.omo\/inbox\/worker-<issue>\.json/u);
  assert.match(issueToPr, /node scripts\/workflow\/implementer-launcher\.mjs ilokesto-ui-implementer \.worktrees\/issue-<number>-<short-title> \.omo\/inbox\/worker-<issue>\.json/u);
  assert.match(issueToPr, /supervisor-boundary\.mjs base-worktree <owner\/name> <base-branch> <remote-full-sha> issue-<number>-<short-title> \.worktrees\/issue-<number>-<short-title>/u);
  assert.match(issueToPr, /compact single-line JSON/u);
  const tasks = permissionEntries(supervisor.header, 'task');
  for (const role of implementers) assert.equal(resolvePermission(tasks, role), 'deny');
  for (const role of reviewers) assert.equal(resolvePermission(tasks, role), 'allow');
  for (const role of ['build', 'explore', 'ilokesto-code-reviewer-extra', 'ilokesto-code-review', '']) {
    assert.equal(resolvePermission(tasks, role), 'deny', role);
  }
  for (const role of implementers) {
    const command = `node scripts/workflow/implementer-launcher.mjs ${role} .worktrees/issue-1-test .omo/inbox/worker-1.json`;
    assert.equal(resolvePermission(supervisor.bash, command), 'allow', command);
  }
  for (const command of [
    'opencode run --dir . --agent ilokesto-scoped-implementer --format json -- escape',
    'OPENCODE_CONFIG_CONTENT={} opencode run --dir .worktrees/issue-1-test --agent ilokesto-scoped-implementer escape',
    'node scripts/workflow/implementer-launcher.mjs build .worktrees/issue-1-test .omo/inbox/worker-1.json',
    'node scripts/workflow/implementer-launcher.mjs ilokesto-scoped-implementer . .omo/inbox/worker-1.json',
    'node scripts/workflow/implementer-launcher.mjs ilokesto-scoped-implementer .worktrees/issue-1-test ../worker.json',
    'node scripts/workflow/implementer-launcher.mjs ilokesto-scoped-implementer .worktrees/issue-1-test .omo/inbox/worker-1.json\nopencode run --agent build',
  ]) assert.equal(resolvePermission(supervisor.bash, command), 'deny', command);
});
