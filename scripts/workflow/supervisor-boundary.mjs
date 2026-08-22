#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { accessSync, constants, lstatSync, realpathSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readCanonicalInboxText } from './canonical-inbox.mjs';
import { LaneLedgerError, discoverWorkspaceRoot } from './lane-ledger.mjs';

const SHA = /^[a-f0-9]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const BRANCH = /^issue-[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const BASE_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const WORKTREE = /^\.worktrees\/issue-[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const ISSUE_URL = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/issues\/(\d+)$/u;
const PR_URL = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/(\d+)$/u;

function fail(message, options) {
  throw new LaneLedgerError('ERR_SIDE_EFFECT_PRECONDITION', message, options);
}

function exactInteger(value, label) {
  if (!/^[1-9]\d*$/u.test(value ?? '')) fail(`${label} must be a positive integer`);
  return Number(value);
}

function validateIdentity(value, pattern, label) {
  if (!pattern.test(value ?? '')) fail(`${label} is invalid`);
  if (label === 'base branch' && (value.includes('..') || value.includes('//') || value.includes('@{') || /[\\~^:?*[\]]/u.test(value) || value.endsWith('/') || value.endsWith('.'))) {
    fail('base branch is invalid');
  }
  return value;
}

function normalizeGitHubRepository(remoteUrl) {
  for (const pattern of [
    /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/u,
    /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/u,
    /^ssh:\/\/git@github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/u,
  ]) {
    const match = remoteUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseJson(source, label) {
  try {
    return JSON.parse(source);
  } catch (cause) {
    fail(`${label} did not return JSON`, { cause });
  }
}

function parseRemoteHead(source, branch) {
  if (source === '') return null;
  const lines = source.split('\n');
  if (lines.length !== 1) fail('remote inspection returned multiple refs');
  const [sha, ref, ...extra] = lines[0].split(/\s+/u);
  if (!SHA.test(sha ?? '') || ref !== `refs/heads/${branch}` || extra.length > 0) fail('remote inspection returned an invalid ref');
  return sha;
}

function createSystemAdapter() {
  let ghExecutable;
  const environment = {
    HOME: userInfo().homedir,
    LANG: 'C',
    LC_ALL: 'C',
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    ...(process.env.GH_TOKEN === undefined ? {} : { GH_TOKEN: process.env.GH_TOKEN }),
    ...(process.env.GITHUB_TOKEN === undefined ? {} : { GITHUB_TOKEN: process.env.GITHUB_TOKEN }),
  };
  return {
    run(file, args, cwd) {
      if (file === 'gh' && ghExecutable === undefined) {
        ghExecutable = ['/opt/homebrew/bin/gh', '/usr/local/bin/gh'].find((path) => {
          try {
            accessSync(path, constants.X_OK);
            return true;
          } catch {
            return false;
          }
        }) ?? null;
        if (ghExecutable === null) fail('GitHub CLI executable is unavailable');
      }
      const executable = file === 'git' ? '/usr/bin/git' : ghExecutable;
      const result = spawnSync(executable, args, {
        cwd,
        encoding: 'utf8',
        env: environment,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (result.error || result.status !== 0) fail(`${file} operation failed`, { cause: result.error });
      return result.stdout.trim();
    },
  };
}

function assertRepository(workspace, repository, adapter) {
  const root = realpathSync(adapter.run('git', ['rev-parse', '--show-toplevel'], workspace));
  if (root !== workspace) fail('workspace is not the canonical repository root');
  const remote = adapter.run('git', ['config', '--get', 'remote.origin.url'], workspace);
  if (normalizeGitHubRepository(remote) !== repository) fail('origin does not match repository');
}

function localHead(workspace, branch, adapter) {
  const sha = adapter.run('git', ['rev-parse', '--verify', `refs/heads/${branch}`], workspace);
  if (!SHA.test(sha)) fail('local branch did not resolve to a full SHA');
  return sha;
}

function remoteHead(workspace, branch, adapter) {
  return parseRemoteHead(adapter.run('git', ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], workspace), branch);
}

function readPrFiles(workspace, issueNumber, titlePath, bodyPath) {
  const title = readCanonicalInboxText(workspace, titlePath);
  const body = readCanonicalInboxText(workspace, bodyPath);
  if (title.trim() !== title || title.length === 0 || title.includes('\n')) fail('PR title file must contain one trimmed line');
  if (!new RegExp(`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${String(issueNumber)}\\b`, 'iu').test(body)) fail('PR body does not bind the issue');
  return { title, body };
}

function assertBranchAtHead(workspace, repository, branch, expectedHead, adapter) {
  assertRepository(workspace, repository, adapter);
  if (localHead(workspace, branch, adapter) !== expectedHead) fail('local branch differs from expected head');
  if (remoteHead(workspace, branch, adapter) !== expectedHead) fail('remote branch differs from expected head');
}

function branchPush(workspace, args, adapter) {
  if (args.length !== 3) fail('branch-push arguments are invalid');
  const [repository, branch, expectedHead] = args;
  validateIdentity(repository, REPOSITORY, 'repository');
  validateIdentity(branch, BRANCH, 'branch');
  validateIdentity(expectedHead, SHA, 'expected head');
  assertRepository(workspace, repository, adapter);
  if (localHead(workspace, branch, adapter) !== expectedHead) fail('local branch differs from expected head');
  const before = remoteHead(workspace, branch, adapter);
  if (before !== null && before !== expectedHead) fail('remote branch already has a different head');
  if (before === null) adapter.run('git', ['-c', 'core.hooksPath=/dev/null', 'push', 'origin', `refs/heads/${branch}:refs/heads/${branch}`], workspace);
  if (remoteHead(workspace, branch, adapter) !== expectedHead) fail('pushed branch did not reach expected head');
  return { operation: 'branch-push', repository, branch, head_sha: expectedHead, effect: before === null ? 'pushed' : 'already-current' };
}

function baseWorktree(workspace, args, adapter) {
  if (args.length !== 5) fail('base-worktree arguments are invalid');
  const [repository, baseBranch, expectedRemoteHead, branch, worktree] = args;
  validateIdentity(repository, REPOSITORY, 'repository');
  validateIdentity(baseBranch, BASE_BRANCH, 'base branch');
  validateIdentity(expectedRemoteHead, SHA, 'remote head');
  validateIdentity(branch, BRANCH, 'branch');
  validateIdentity(worktree, WORKTREE, 'worktree');
  if (worktree !== `.worktrees/${branch}`) fail('worktree does not match branch');
  assertRepository(workspace, repository, adapter);
  if (remoteHead(workspace, baseBranch, adapter) !== expectedRemoteHead) fail('remote base differs from expected head');
  const worktreePath = resolve(workspace, worktree);
  const parent = resolve(workspace, '.worktrees');
  const parentStats = lstatSync(parent);
  if (parentStats.isSymbolicLink() || !parentStats.isDirectory() || realpathSync(parent) !== parent || dirname(worktreePath) !== parent) fail('worktree parent is invalid');
  try {
    lstatSync(worktreePath);
    fail('worktree already exists');
  } catch (error) {
    if (error instanceof LaneLedgerError || error?.code !== 'ENOENT') throw error;
  }
  if (adapter.run('git', ['branch', '--list', branch], workspace) !== '') fail('local branch already exists');
  if (adapter.run('git', ['worktree', 'list', '--porcelain'], workspace).split('\n').includes(`worktree ${worktreePath}`)) fail('worktree is already registered');
  adapter.run('git', ['fetch', 'origin', `refs/heads/${baseBranch}`], workspace);
  if (adapter.run('git', ['rev-parse', 'FETCH_HEAD'], workspace) !== expectedRemoteHead) fail('fetched base differs from expected head');
  adapter.run('git', ['-c', 'core.hooksPath=/dev/null', 'worktree', 'add', '-b', branch, worktreePath, expectedRemoteHead], workspace);
  if (adapter.run('git', ['-C', worktreePath, 'branch', '--show-current'], workspace) !== branch
    || adapter.run('git', ['-C', worktreePath, 'rev-parse', 'HEAD'], workspace) !== expectedRemoteHead) fail('created worktree identity differs');
  return { operation: 'base-worktree', repository, base_branch: baseBranch, base_sha: expectedRemoteHead, branch, worktree };
}

function prEffect(operation, workspace, args, adapter) {
  const create = operation === 'pr-create';
  if (args.length !== (create ? 7 : 8)) fail(`${operation} arguments are invalid`);
  const [repository, prValue, baseValue, branchValue, headValue, issueValue, titleValue, bodyValue] = create
    ? [args[0], null, ...args.slice(1)]
    : args;
  validateIdentity(repository, REPOSITORY, 'repository');
  const prNumber = create ? null : exactInteger(prValue, 'PR number');
  const baseBranch = validateIdentity(baseValue, BASE_BRANCH, 'base branch');
  const branch = validateIdentity(branchValue, BRANCH, 'branch');
  const expectedHead = validateIdentity(headValue, SHA, 'expected head');
  const issueNumber = exactInteger(issueValue, 'issue number');
  const { title, body } = readPrFiles(workspace, issueNumber, titleValue, bodyValue);
  assertBranchAtHead(workspace, repository, branch, expectedHead, adapter);
  if (create) {
    const existing = parseJson(adapter.run('gh', ['pr', 'list', '--repo', repository, '--head', branch, '--base', baseBranch, '--state', 'all', '--json', 'number'], workspace), 'PR list');
    if (!Array.isArray(existing) || existing.length !== 0) fail('PR already exists for branch and base');
    const url = adapter.run('gh', ['pr', 'create', '--repo', repository, '--head', branch, '--base', baseBranch, '--title', title, '--body', body], workspace);
    if (PR_URL.exec(url)?.[1] !== repository) fail('PR create returned an invalid URL');
    return inspectPr(operation, workspace, repository, url, baseBranch, branch, expectedHead, issueNumber, adapter);
  }
  inspectPr(operation, workspace, repository, String(prNumber), baseBranch, branch, expectedHead, issueNumber, adapter);
  adapter.run('gh', ['pr', 'edit', String(prNumber), '--repo', repository, '--title', title, '--body', body], workspace);
  return inspectPr(operation, workspace, repository, String(prNumber), baseBranch, branch, expectedHead, issueNumber, adapter);
}

function inspectPr(operation, workspace, repository, selector, baseBranch, branch, expectedHead, issueNumber, adapter) {
  const pr = parseJson(adapter.run('gh', ['pr', 'view', selector, '--repo', repository, '--json', 'number,baseRefName,headRefName,headRefOid,body,url'], workspace), 'PR view');
  if (!Number.isInteger(pr.number) || pr.baseRefName !== baseBranch || pr.headRefName !== branch || pr.headRefOid !== expectedHead
    || !new RegExp(`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${String(issueNumber)}\\b`, 'iu').test(pr.body ?? '')) fail('PR identity differs after mutation');
  return { operation, repository, pr_number: pr.number, base_branch: baseBranch, branch, head_sha: expectedHead, issue_number: issueNumber, url: pr.url };
}

function issueCreate(workspace, args, adapter) {
  if (args.length !== 3) fail('issue-create arguments are invalid');
  const [repository, titlePath, bodyPath] = args;
  validateIdentity(repository, REPOSITORY, 'repository');
  assertRepository(workspace, repository, adapter);
  const title = readCanonicalInboxText(workspace, titlePath);
  const body = readCanonicalInboxText(workspace, bodyPath);
  if (title.trim() !== title || title.length === 0 || title.includes('\n') || body.length === 0) fail('issue title or body is invalid');
  const url = adapter.run('gh', ['issue', 'create', '--repo', repository, '--title', title, '--body', body], workspace);
  const match = ISSUE_URL.exec(url);
  if (!match || match[1] !== repository) fail('issue create returned an invalid URL');
  const issue = parseJson(adapter.run('gh', ['issue', 'view', match[2], '--repo', repository, '--json', 'number,url,title'], workspace), 'issue view');
  if (issue.number !== Number(match[2]) || issue.url !== url || issue.title !== title) fail('created issue identity differs');
  return { operation: 'issue-create', repository, issue_number: issue.number, url };
}

export function runSupervisorBoundary(argv, injected = {}) {
  const [operation, ...args] = argv;
  const workspace = realpathSync(injected.workspace ?? discoverWorkspaceRoot());
  const adapter = injected.adapter ?? createSystemAdapter();
  if (operation === 'branch-push') return branchPush(workspace, args, adapter);
  if (operation === 'base-worktree') return baseWorktree(workspace, args, adapter);
  if (operation === 'pr-create' || operation === 'pr-update') return prEffect(operation, workspace, args, adapter);
  if (operation === 'issue-create') return issueCreate(workspace, args, adapter);
  fail('supervisor operation is invalid');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(runSupervisorBoundary(process.argv.slice(2)), null, 2)}\n`);
  } catch (error) {
    if (error instanceof LaneLedgerError) {
      process.stderr.write(`${error.code}: ${error.message}\n`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
