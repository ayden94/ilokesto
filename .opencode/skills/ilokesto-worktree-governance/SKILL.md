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

This skill captures the worktree isolation rules that implementers and `/execute-lane` must follow.

## Worktree Path

All isolated implementation work must occur in dedicated git worktrees under `.worktrees/`.

```text
WORKTREE_PATH = <repo-root>/.worktrees/<branch-name>
```

- Implementers must reject work if `WORKTREE_PATH` is not provided.
- Implementers must not edit files outside `WORKTREE_PATH`.
- `main` and other worktrees must not be touched directly.

## Branch Naming

```text
issue-<number>-<short-title>
```

- `<short-title>` is the issue title in kebab-case with unsafe characters removed.
- Branch names must be unique within `.worktrees/`.

## Worktree Creation

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
BASE_BRANCH="${BASE_BRANCH:-main}"
BRANCH_NAME="issue-<number>-<short-title>"
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${BRANCH_NAME}"

git fetch origin
git worktree add -b "${BRANCH_NAME}" "${WORKTREE_PATH}" "origin/${BASE_BRANCH}"
```

- Local-only base branch may use `${BASE_BRANCH}` instead of `origin/${BASE_BRANCH}`.
- New implementation must not overwrite existing branch or worktree; abort on collision.

## Fix-Back Mode

When `/execute-lane` passes a `block` verdict from `/pr-to-merge`, `/issue-to-pr` re-enters in fix-back mode.

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

- `EXISTING_PR` head branch must match `BRANCH_NAME`; otherwise report `blocked-child-contract-error`.
- `WORKTREE_PATH` must point to the existing `.worktrees/<branch-name>`.
- Do not create new branch, worktree, PR, or issue.
- Only remediate `BLOCKERS`; no unrelated refactoring.
- Report `fix_back_result: remediated|still-blocked|needs-human-check`.

## Cleanup Gate

- `git worktree remove`, `git branch -d/-D`, and remote branch deletion are forbidden by default.
- Cleanup only happens after explicit user approval or `/execute-lane` authority.
- Cleanup must only run after merge is actually confirmed.