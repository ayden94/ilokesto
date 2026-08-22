---
name: ilokesto-workflow-governance
description: Use when defining, reviewing, or handing off ilokesto workflow states, transition receipts, ownership, dependencies, authority, retries, or durable evidence.
compatibility: opencode
metadata:
  language: en
  domain: workflow
  mode: knowledge
---

# ilokesto Workflow Governance

This skill is the human-readable source of truth for the ilokesto workflow contract. Runtime validation and persistence belong to the executable workflow module. This document must not duplicate executable transition logic.

## Contract Version

Version 1 is the first and only supported ilokesto ledger version. A missing or different version is rejected. There is no migration, compatibility, dual-schema, version negotiation, fallback parsing, or legacy synonym support.

## Canonical Platform Policy

The runtime store has one canonical strategy per supported platform. Linux opens `workspace/.omo/lanes/locks` descriptor-relatively through `/proc/self/fd` and fstats targets. Darwin uses the verified identity-bound `bound-path` strategy because directory traversal through `/dev/fd` is unavailable. Darwin opens canonical no-follow directories, retains descriptor, device, and inode identities, and revalidates realpath, type, device, and inode before every critical operation. It uses exclusive temporary writes, file fsync, atomic rename, and parent-directory fsync, and binds lock release to directory identity and owner token. If parent, target, or lock substitution is observed, the operation fails before persistence and never deletes the replacement. Unsupported platforms fail closed. This Darwin strategy is canonical platform behavior, not compatibility parsing or a fallback executor.

## Canonical States

The version 1 item states are:

`queued`, `dispatching`, `implementing`, `implementation-complete`, `pr-open`, `in-review`, `fix-back-pending`, `fix-back`, `merge-ready`, `merged`, `cleanup-pending`, `done`, and `release-handoff`.

Stable persisted terminal item states are:

`blocked-child-contract-error`, `blocked-ledger-conflict`, `blocked-retry-exhausted`, `blocked-maintainer-decision`, `blocked-dirty-worktree`, and `needs-human-check-terminal`.

Workflow states are exactly `ready`, `running`, `done`, and `blocked-terminal`. Version 1 has no pause state or pause transition.

Accepted state/verdict aliases: none.

## Canonical Transition Contract

| Event / outcome | From | To | Sole producer | Required proof |
| --- | --- | --- | --- | --- |
| `lane.created` | absent | item `queued`; workflow `ready` | supervisor create operation | approved source selection, repository/base identity |
| `workflow.started` | workflow `ready` | workflow `running` | supervisor | valid replay, no conflicting writer lock |
| `item.dispatched` | `queued` | `dispatching` | supervisor | dependencies merged and base SHA contains required merge SHAs |
| `worker.started` | `dispatching` | `implementing` | supervisor from dispatch receipt | dispatch/item/attempt/worktree identity |
| `worker.completed` | `implementing` or `fix-back` | `implementation-complete` | supervisor after verifying child receipt | commit SHA, changed files, verification receipts, current attempt |
| `pr.opened` or `pr.updated` | `implementation-complete` | `pr-open` | supervisor | exact PR number, branch, current head SHA, issue linkage |
| `review.started` | `pr-open` | `in-review` | supervisor | current PR head/check identities |
| `review.completed: merge` | `in-review` | `merge-ready` | supervisor after all reviewers | every required reviewer PASS and checks PASS at current head |
| `review.completed: block` | `in-review` | `fix-back-pending` | supervisor | fixable stable blocker signatures and remaining retry budget |
| `review.completed: needs-human-check` | `in-review` | `needs-human-check-terminal` | supervisor | non-fixable policy/security/scope evidence |
| `evidence.invalidated` | `pr-open` or `in-review` | `pr-open` | supervisor reconciliation | changed live head SHA and identities of superseded review/check receipts |
| `fix_back.started` | `fix-back-pending` | `fix-back` | supervisor | same PR/branch/worktree, incremented attempt, exact blockers |
| `merge.completed` | `merge-ready` | `merged` | authority-gated merge wrapper | live head/check revalidation, squash merge SHA, matching authority |
| `cleanup.started` | `merged` | `cleanup-pending` | supervisor | confirmed merged PR and command-owned worktree baseline |
| `cleanup.completed` or `cleanup.skipped` | `cleanup-pending` | `done` | authority-gated cleanup wrapper or supervisor skip | cleanup receipt or explicit skipped-authority receipt |
| `cleanup.blocked` | `cleanup-pending` | `blocked-dirty-worktree` | cleanup wrapper | tracked/untracked baseline conflict evidence |
| `release_handoff.created` | `queued` | `release-handoff` | supervisor | immutable non-authorizing readiness payload |
| `authority.granted` | authority absent | authority present/unconsumed; no item-state change | dedicated native-approval-gated authorize operation | exact repository/lane/issues/operations, squash method, approval timestamp |
| `root_sync.completed` or `root_sync.skipped` | all items `done` or `release-handoff`; root sync pending | root sync terminal; no item-state change | authority-gated root-sync wrapper or supervisor skip | consumed matching authority plus ff-only SHA, or explicit skipped-authority reason |
| `root_sync.blocked` | all items `done` or `release-handoff`; root sync pending | workflow `blocked-terminal` | root-sync wrapper | dirty root, non-ff, or external identity evidence |
| `item.blocked` | any non-terminal item state | one stable terminal error state | supervisor/guarded wrapper | stable error code and evidence |
| `workflow.completed` | workflow `running` | workflow `done` | supervisor | every item is `done` or `release-handoff`, root sync is completed or skipped, and no stale/pending evidence |
| `workflow.blocked` | workflow `running` | workflow `blocked-terminal` | supervisor | at least one terminal error item and no runnable recovery |

`authority.granted` is forbidden to the general transition operation and may only be appended by the dedicated native-approval-gated authorize operation.

## Receipts and Evidence

Every receipt has this envelope:

`version`, `receipt_id`, `event`, `lane_id`, `item_id`, `attempt`, `dispatch_id`, `producer`, `expected_revision`, `repository`, `base_branch`, `created_at`, and typed `payload`.

PR-bound receipts additionally require integer `pr_number` and a 40-character `head_sha`.

Receipts are append-only, identity-bound, and authoritative. The current lane snapshot is a replayed projection. A projection or history mismatch is invalid.

Durable evidence stores only `evidence_sha256` and a session-free repository-relative artifact basename, such as `task-1-workflow-ledger-handover.txt`. It never stores an attempt directory, session ID, goal prefix, absolute home path, credential, environment value, prompt, transcript, or runtime session ID.

Verification receipts contain the command, repository-relative cwd, started and finished timestamps, exit code, head SHA, `evidence_sha256`, and a session-free repository-relative artifact basename.

`review.completed` declares the exact boolean `docs_release_required`. Its base reviewer keys are exactly `contract`, `code`, and `verification`. When the boolean is false, those are the only reviewer keys and `docs_release` is rejected. When true, `docs_release` is required as the fourth exact key. Every required reviewer directly supplies a unique `receipt_id`, uppercase `status` (`PASS`, `BLOCK`, or `NEEDS_HUMAN_CHECK`), `evidence_sha256`, and session-free `artifact_basename`. Merge requires every required reviewer to PASS. Any required reviewer may cause `block`; without a BLOCK, any required reviewer may cause `needs-human-check`.

## Dependencies and Dispatch

Hard dependencies are ancestry edges. Before dispatch, every hard dependency must be merged into the dependent item’s recorded base SHA, and the base SHA must contain the required merge SHAs. An ordering-only edge constrains sequence but does not require the predecessor’s merge SHA in the dependent base.

Workers, reviewers, fix-back workers, merge wrappers, cleanup wrappers, and release-readiness handoffs produce receipts only through the supervisor’s governed transition. The supervisor is the sole ledger writer. Implementers own edits, tests, and commits in assigned worktrees. Reviewers remain read-only.

## Authority and Retry Rules

Merge, cleanup, and root sync require a separately recorded, user-approved authority receipt. Writable ledger booleans cannot mint authority. The authority receipt must match the exact repository, lane, issues, operations, squash method, and approval timestamp, and it is consumed by the authorized operation.

A changed PR head sends `pr-open` or `in-review` back to `pr-open` by appending `evidence.invalidated`. Previous review and check receipts remain historical but cannot satisfy merge readiness.

The retry budget is three fix-back attempts per item. A fourth request, or the same blocker signature after the third attempt, transitions to `blocked-retry-exhausted`.

## Stable Operation Errors

The stable non-persisting operation errors are exactly:

`ERR_UNSUPPORTED_VERSION`, `ERR_INVALID_SCHEMA`, `ERR_ILLEGAL_TRANSITION`, `ERR_PROJECTION_DRIFT`, `ERR_DUPLICATE_RECEIPT`, `ERR_REVISION_CONFLICT`, `ERR_LOCK_BUSY`, `ERR_STALE_LOCK`, `ERR_PATH_OUTSIDE_ROOT`, `ERR_PATH_SYMLINK`, `ERR_INVALID_TARGET_TYPE`, `ERR_INVALID_RECEIPT`, `ERR_STALE_HEAD`, `ERR_AUTHORITY_MISSING`, `ERR_AUTHORITY_MISMATCH`, `ERR_AUTHORITY_CONSUMED`, `ERR_SIDE_EFFECT_PRECONDITION`, and `ERR_FORBIDDEN_DATA`.

These errors leave ledger bytes unchanged. The additional stable operation error is `ERR_DURABILITY_UNCERTAIN`; it means atomic rename published the exact ledger but parent-directory fsync did not confirm durability, and it is never valid in a persisted `item.blocked` receipt. A concurrent same-revision loser returns `ERR_REVISION_CONFLICT`; it does not persist `blocked-ledger-conflict`. That persisted state is reserved for a later successful supervisor reconciliation transition that proves a ledger versus Git, GitHub, or worktree identity conflict and appends an `item.blocked` receipt at a valid new revision.

## Forbidden Inputs and Data

`approve`, `approved`, minimal pending-item schemas, and legacy synonyms are not supported inputs. Do not add alternative states, aliases, transitions, migrations, compatibility parsing, fallback interpretation, freely mutable snapshots, direct command-authored JSON state, multiple writers, or child and reviewer ledger writes.

Do not persist absolute home paths, credentials, environment values, prompts, transcripts, runtime session IDs, or other secret-like data in durable receipts. Do not use a blanket permission grant, generic mutating `gh api *`, arbitrary ref push, reviewer write access, implementer merge or cleanup or PR authority, an undocumented fallback executor, local publish, GitHub Actions publish dispatch, or Version Packages PR mutation.
