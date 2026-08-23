---
name: ilokesto-worktree-governance
description: Use when implementing or reviewing work inside an ilokesto worktree. Covers worktree path rules, branch naming, fix-back mode, and cleanup gates.
compatibility: opencode
metadata:
  language: en
  domain: worktree
  mode: knowledge
---

# ilokesto Worktree Governance

This skill captures the worktree isolation rules that implementers and `/execute-lane` must follow. State, transition, receipt, authority, and evidence semantics live only in [`ilokesto-workflow-governance`](../ilokesto-workflow-governance/SKILL.md).

## Worktree Path

All isolated implementation work must occur in dedicated git worktrees under `.worktrees/`.

```text
WORKTREE_PATH = <repo-root>/.worktrees/<branch-name>
```

- The supervisor creates and registers the worktree before launching an implementer. Implementers must reject work if `WORKTREE_PATH` is not provided.
- Implementers must not edit files outside `WORKTREE_PATH`.
- `main` and other worktrees must not be touched directly.

## Branch Naming

```text
issue-<number>-<short-title>
```

- `<short-title>` is the issue title in kebab-case with unsafe characters removed.
- `<number>` is a positive integer and must equal the assigned issue number at every handoff and PR ingress.
- The exact grammar is `issue-<positive-number>-<lowercase-kebab-slug>`; uppercase, underscores, dots, slashes, and empty slugs are invalid.
- Branch names must be unique within `.worktrees/`.

## Worktree Creation

```text
node scripts/workflow/supervisor-boundary.mjs base-worktree <owner/name> <base-branch> <remote-full-sha> issue-<number>-<short-title> .worktrees/issue-<number>-<short-title>
```

- The wrapper validates canonical `origin`, exact remote SHA, a non-existing `issue-*` branch, and a non-existing one-segment `.worktrees/issue-*` path before its single fetch-and-create effect. Raw `git fetch` and `git worktree add` are not supervisor capabilities.
- New implementation must not overwrite existing branch or worktree; abort on collision.

## Fix-Back Mode

When `/execute-lane` receives a fixable review receipt from `/pr-to-merge`, `/issue-to-pr` re-enters in fix-back mode.

Required inputs:

```yaml
ISSUE_URL: <resolved-issue-url>
EXISTING_PR: <pr-url-or-number>
BASE_BRANCH: <base-branch>
BRANCH_NAME: <existing-pr-head-branch>
WORKTREE_PATH: <repo-root>/.worktrees/<branch-name>
BLOCKERS:
  - reviewer: <contract|code|verification>
    signature: <stable blocker identifier>
    evidence: <file/check/doc evidence>
FIX_BACK_ATTEMPT: <1|2|3>
```

Fix-back rules:

- `EXISTING_PR` head branch must match `BRANCH_NAME`; otherwise return the canonical child-contract error through the supervisor.
- `WORKTREE_PATH` must point to the existing `.worktrees/<branch-name>`.
- Do not create new branch, worktree, PR, or issue.
- Only remediate `BLOCKERS`; no unrelated refactoring.
- Report `fix_back_result: remediated|still-blocked|needs-human-check`.

## Cleanup Gate

- `git worktree remove`, `git branch -d/-D`, and remote branch deletion are forbidden by default.
- Cleanup only happens after explicit user approval or `/execute-lane` authority.
- Cleanup must only run after merge is actually confirmed.

## Handover and release boundary

- Implementers edit, test, and commit only in the assigned worktree, then return a machine-readable handover receipt. They do not create worktrees, push, create PRs, write ledgers, merge, clean up, or publish.
- Resume and reconciliation use persisted receipts plus current Git, GitHub, and worktree facts. They never repeat a side effect already proved complete.
- Merge, cleanup, and root sync require separate approved authority receipts, each consumed by one operation.
- Version 1 is a clean cutover. There is no migration, alias, fallback parser, or compatibility layer. Durable receipts and evidence contain no secrets, session IDs, absolute local paths, or raw transcripts.
- Release stops at a non-authorizing GitHub Actions handoff. OpenCode never publishes packages.
