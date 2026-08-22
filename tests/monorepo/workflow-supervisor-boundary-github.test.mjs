import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { runSupervisorBoundary } from '../../scripts/workflow/supervisor-boundary.mjs';

const environment = Object.fromEntries(
  ['HOME', 'LANG', 'LC_ALL', 'PATH', 'TMPDIR'].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]),
);

async function workspace(context) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'ilokesto-supervisor-github-')));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.omo', 'inbox'), { recursive: true });
  const initialized = spawnSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: root, env: environment, shell: false });
  assert.equal(initialized.status, 0, initialized.stderr);
  return root;
}

function adapterFor(root, handler) {
  const calls = [];
  return {
    calls,
    run(file, args) {
      calls.push([file, args]);
      if (file === 'git' && args.join(' ') === 'rev-parse --show-toplevel') return root;
      if (file === 'git' && args.join(' ') === 'config --get remote.origin.url') return 'https://github.com/ilokesto/ilokesto.git';
      return handler(file, args);
    },
  };
}

test('PR update reinspects the exact existing PR after applying canonical inbox title and body', async (context) => {
  const root = await workspace(context);
  const sha = 'e'.repeat(40);
  await Promise.all([
    writeFile(join(root, '.omo', 'inbox', 'title.txt'), 'Update the workflow boundary'),
    writeFile(join(root, '.omo', 'inbox', 'body.md'), 'Closes #101\n'),
  ]);
  let views = 0;
  const adapter = adapterFor(root, (file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse --verify refs/heads/issue-101-test') return sha;
    if (file === 'git' && args.join(' ') === 'ls-remote --heads origin refs/heads/issue-101-test') return `${sha}\trefs/heads/issue-101-test`;
    if (file === 'gh' && args[0] === 'pr' && args[1] === 'view') {
      views += 1;
      return JSON.stringify({ number: 51, baseRefName: 'main', headRefName: 'issue-101-test', headRefOid: sha, body: 'Closes #101\n', url: 'https://github.com/ilokesto/ilokesto/pull/51' });
    }
    if (file === 'gh' && args[0] === 'pr' && args[1] === 'edit') {
      assert.deepEqual(args, ['pr', 'edit', '51', '--repo', 'ilokesto/ilokesto', '--title', 'Update the workflow boundary', '--body', 'Closes #101\n']);
      return 'https://github.com/ilokesto/ilokesto/pull/51';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const result = runSupervisorBoundary(['pr-update', 'ilokesto/ilokesto', '51', 'main', 'issue-101-test', sha, '101', '.omo/inbox/title.txt', '.omo/inbox/body.md'], { workspace: root, adapter });

  assert.equal(result.pr_number, 51);
  assert.equal(views, 2);
});

test('issue create performs one path-confined mutation and reinspects its repository identity', async (context) => {
  const root = await workspace(context);
  await Promise.all([
    writeFile(join(root, '.omo', 'inbox', 'issue-title.txt'), 'Workflow boundary gap'),
    writeFile(join(root, '.omo', 'inbox', 'issue-body.md'), 'The supervisor needs a fixed executable boundary.\n'),
  ]);
  const adapter = adapterFor(root, (file, args) => {
    if (file === 'gh' && args[0] === 'issue' && args[1] === 'create') {
      assert.deepEqual(args, ['issue', 'create', '--repo', 'ilokesto/ilokesto', '--title', 'Workflow boundary gap', '--body', 'The supervisor needs a fixed executable boundary.\n']);
      return 'https://github.com/ilokesto/ilokesto/issues/77';
    }
    if (file === 'gh' && args[0] === 'issue' && args[1] === 'view') return JSON.stringify({ number: 77, url: 'https://github.com/ilokesto/ilokesto/issues/77', title: 'Workflow boundary gap' });
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const result = runSupervisorBoundary(['issue-create', 'ilokesto/ilokesto', '.omo/inbox/issue-title.txt', '.omo/inbox/issue-body.md'], { workspace: root, adapter });

  assert.equal(result.issue_number, 77);
  assert.equal(adapter.calls.filter(([file, args]) => file === 'gh' && args[1] === 'create').length, 1);
});
