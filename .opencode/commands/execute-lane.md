---
description: execute-lane — canonical receipts를 single-writer로 drain하고 Git/GitHub/worktree 사실을 재조정하는 lane 실행 하네스
argument-hint: "<lane-id> [resume] [--full-auto]"
agent: ilokesto-workflow-supervisor
---

# execute-lane

`/execute-lane`은 승인된 `lane.created` 범위를 다시 해석하지 않고 기존 lane을 끝까지 drain한다. `ilokesto-workflow-governance`가 상태/receipt SSOT이고 `lane-ledger.mjs`가 유일한 replay/validation/persistence 구현이다. 이 command와 child는 ledger JSON 또는 projection을 직접 편집하지 않는다.

```workflow-command-contract
{
  "version": 1,
  "command": "execute-lane",
  "owner": "supervisor",
  "ledger_operations": ["validate", "project", "transition"],
  "side_effect_operations": ["merge", "cleanup", "root-sync"],
  "progression": "per-item-drain",
  "revision_guard": "after-every-boundary",
  "conflict_state": "blocked-ledger-conflict",
  "authority_consumption": ["merge:<issue>", "cleanup:<issue>", "root-sync"]
}
```

## Usage

```text
/execute-lane <lane-id>
/execute-lane <lane-id> resume
/execute-lane <lane-id> --full-auto
```

Only the canonical `lane-...` ID is accepted. Do not accept a caller-selected ledger/root path, recreate source selection, add issues, or infer package scope.

## Entry and resume gate

Run this gate on every start and resume, including recovery after a child or external command failure:

1. Load `ilokesto-workflow-governance` and `ilokesto-worktree-governance`.
2. Run `node scripts/workflow/lane-ledger-cli.mjs validate <lane-id>`.
3. Run `node scripts/workflow/lane-ledger-cli.mjs project <lane-id>` and use only the replayed projection and current revision.
4. Refuse a terminal workflow, projection drift, invalid schema/version, active stale completion claim, or an identity that differs from the immutable lane receipt history.
5. Capture an immutable invocation baseline before effects: root `HEAD`, tracked changes, untracked changes, current branch, and remote base head. For every command-owned item, capture exact PR number/head/check identities/merge SHA, assigned branch heads, assigned worktree existence/current branch, and tracked/untracked worktree changes.
6. If the workflow is `ready`, write one canonical compact receipt to `.omo/inbox/<receipt>.json`, then append only `workflow.started` through `node scripts/workflow/lane-ledger-cli.mjs transition <lane-id> --expected-revision <revision> .omo/inbox/<receipt>.json`, then validate/project again.

Never use stdin, shell redirection, a receipt path outside the direct `.omo/inbox/` boundary, direct `.omo/lanes/*.json` edits, or a second persistence implementation.

## Boundary revision protocol

Every child dispatch, child response, `git`/`gh` inspection, branch push, PR create/update, reviewer result, and wrapper call is a boundary.

1. Record `expected_revision = R` from the latest validated projection before crossing the boundary.
2. Perform one bounded child call or one exact external read/effect.
3. Immediately run `validate` and `project` again.
4. If the current revision is not `R`, discard the candidate result, re-read every fact needed by that item, and re-plan from replay. A concurrent CAS loser returns `ERR_REVISION_CONFLICT`; it never writes `blocked-ledger-conflict`.
5. If revision remains `R`, compare repository, lane, item, issue, attempt, dispatch, base, PR, full head SHA, check name/run ID/head, branch, worktree, and authority identity before appending.
6. Append exactly one canonical receipt from its direct `.omo/inbox/` input file with `expected_revision: R`, validate/project, then continue the drain.

External facts are observations, never projection mutations. A proven ledger-versus-Git/GitHub/worktree identity conflict is persisted at the next valid revision as `item.blocked` with `error_state: blocked-ledger-conflict` and bounded evidence. Do not auto-repair, remap a PR, switch a branch, replace a worktree, or reuse another item’s identity.

## Per-item drain

Use `scripts/workflow/execute-lane-reconcile.mjs` as the deterministic decision contract. Re-plan all non-terminal items after every accepted receipt; execute independently runnable item actions immediately. Do not wait for a parallel group, all workers, all PRs, or all reviews.

- A hard dependency may dispatch only after the prerequisite is `merged`, `cleanup-pending`, or `done`, has a canonical merge SHA, and the inspected dependent base contains every `required_merge_sha`. Record the inspected base SHA and ancestry result in `item.dispatched`.
- An ordering-only dependency waits only for the predecessor to be terminal. It adds no merge SHA and makes no ancestry claim.
- `dispatching`, `implementing`, and `fix-back` are active child states. Reconciliation waits for their bound completion; it does not synthesize or accept stale success.
- New work enters `/issue-to-pr` with the exact replayed issue/base/dispatch/worktree identity. Only the supervisor appends `worker.started`, verified `worker.completed`, and subsequent PR receipts.
- After `worker.completed`, inspect the exact remote branch and PR before deciding to push or create anything.
- Push only through `node scripts/workflow/supervisor-boundary.mjs branch-push <owner/name> <issue-branch> <expected-full-sha>`. The wrapper accepts one `issue-*` ref, compares the exact local SHA, pushes one full refspec, and reinspects the remote head.
- Create or update PRs only through `supervisor-boundary.mjs pr-create` or `pr-update` with the exact repository, base, issue branch, expected full head SHA, issue number, and direct `.omo/inbox/` title/body files. Extra flags and host paths are forbidden.
- A current `pr-open` item appends `review.started` with the full current head and check identities before invoking `/pr-to-merge`.

## PR, review, and fix-back reconciliation

- One exact matching PR may produce `pr.opened` or, after fix-back, `pr.updated`. Zero PRs may permit one create. Multiple PRs or any issue/branch/number/head substitution produce `blocked-ledger-conflict`.
- If a pending review’s live PR head changes, append `evidence.invalidated` with the exact pending review receipt ID and every exact superseded check run ID. Re-read checks and start a new review at the new full head. Old review/check receipts remain history and cannot satisfy merge.
- A changed head after merge readiness is stale evidence and must not merge. Persist a proven identity conflict or return the canonical stale-head error; never reuse the old review.
- A `block` result stays on the same PR, branch, worktree, item, and dispatch. `fix_back.started` increments only the attempt and carries exactly the blocker signatures and blocking review receipt.
- Permit at most attempts 1, 2, and 3. A fourth request, any block after attempt 3, or a repeated blocker signature after attempt 3 appends `item.blocked` with `blocked-retry-exhausted`. Do not create a replacement PR or reset the retry count.
- `needs-human-check` is terminal and cannot enter fix-back or merge.

## Crash-window decisions

| Restart observation | Required decision |
| --- | --- |
| Assigned branch push completed, receipt/next step absent | If the exact remote branch head equals `worker.completed.committed_head_sha`, do not push again; continue to PR reconciliation. A different head is `blocked-ledger-conflict`. |
| PR create completed, `pr.opened` absent | If exactly one PR matches repository/base/issue/branch/full head, append `pr.opened`; do not create another PR. Any ambiguity or mismatch is `blocked-ledger-conflict`. |
| Squash merge completed, `merge.completed` absent | Invoke only the merge wrapper. Its locked inspection appends the discovered exact merge SHA when head/check/authority identities still match; it never merges twice. Missing or conflicting merge identity fails closed. |
| Cleanup completed, cleanup outcome absent | Invoke only the cleanup wrapper. It appends `cleanup.skipped: already-removed` only when the exact worktree, local branch, and remote branch are all absent. Residual artifacts continue guarded cleanup; tracked/untracked conflicts append `cleanup.blocked`. |

## Authority-gated effects

`--full-auto` requests no authority by itself. Effects require a separately persisted, current, unconsumed `authority.granted` receipt.

- Merge: call only `node scripts/workflow/workflow-side-effect.mjs merge <lane-id> <item-id> --expected-revision <revision> --authority-receipt <receipt-id>`. It consumes `merge:<issue>` only through `merge.completed`.
- Cleanup: after confirming the matching merge, append `cleanup.started` with the immutable command-owned tracked/untracked worktree baseline. Then call only the cleanup wrapper. It consumes `cleanup:<issue>` only through `cleanup.completed` or `cleanup.skipped`; a dirty block does not authorize unrelated cleanup.
- Root sync: only after every item is `done` or `release-handoff`, recheck the immutable root baseline and call only the root-sync wrapper. It consumes lane-global `root-sync` only through completed/skipped. Dirty root, non-ff, or identity mismatch is blocked and never bypassed.

Never call `gh pr merge`, generic mutating `gh api`, `git worktree remove`, branch deletion, remote delete push, `git pull`, `git merge`, or another destructive equivalent directly. Never use one item’s merge/cleanup authority for another item, and never reuse consumed authority.

## Completion

Append `workflow.completed` only when replay proves every item is `done` or `release-handoff`, root sync is completed/skipped by its current receipt, no child/review/effect remains active, and no stale evidence remains. Append `workflow.blocked` only when every item is terminal and replay proves there is no runnable recovery.

Report the final validated revision, each item’s canonical state/PR/head/merge/cleanup result, consumed authority keys, root-sync receipt, and ledger ID. Do not claim completion from prose child output or external state alone.

## Forbidden

- No global batch barrier, queued-only resume scan, scope rediscovery, direct ledger JSON edit, projection mutation, second schema, or second persistence path.
- No authority minting from flags/booleans, no direct destructive equivalent, no duplicate side effect, no unrelated cleanup, no dirty root/worktree bypass, and no local publish.
- No completion while a child is active, review/check identity is stale or pending, cleanup is unresolved, root sync is pending, or a terminal conflict lacks a canonical receipt.
