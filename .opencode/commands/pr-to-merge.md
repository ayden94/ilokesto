---
description: pr-to-merge — PR 1개를 필수 reviewer와 조건부 docs-release reviewer로 병렬 검토하여 canonical review.completed receipt를 반환하는 읽기 전용 검토 하네스
argument-hint: "<pr-url|pr-number>"
agent: ilokesto-workflow-supervisor
---

# pr-to-merge

State, receipt, authority, and evidence semantics are defined by `ilokesto-workflow-governance`; this command only returns a verified review receipt.

```workflow-command-contract
{
  "version": 1,
  "command": "pr-to-merge",
  "owner": "supervisor",
  "output_event": "review.completed",
  "outcomes": ["merge", "block", "needs-human-check"],
  "reviewer_roles": {
    "base": ["contract", "code", "verification"],
    "conditional": { "docs_release": "docs_release_required" }
  },
  "identity": ["repository", "lane_id", "item_id", "attempt", "dispatch_id", "expected_revision", "base_branch", "pr_number", "head_sha", "checks"],
  "fix_back_identity": ["repository", "lane_id", "item_id", "attempt", "dispatch_id", "expected_revision", "base_branch", "pr_number", "head_sha", "branch", "worktree", "blocker_signatures", "review_receipt_id"],
  "child_recovery": ["same-session-request-once", "read-only-reconcile", "blocked-child-contract-error"]
}
```

이 커맨드는 PR 1개를 세 개의 필수 reviewer 에이전트와 조건부 docs-release reviewer로 병렬 검토하여 `review.completed` receipt를 반환하는 읽기 전용 검토 하네스다. Reviewer 상태는 `PASS | BLOCK | NEEDS_HUMAN_CHECK`이고 aggregate receipt outcome은 `merge | block | needs-human-check`다.

## 사용법

```
/pr-to-merge <pr-url|pr-number>
```

예시:

```
/pr-to-merge 456
/pr-to-merge https://github.com/ilokesto/ilokesto/pull/456
```

## 하네스 책임

1. **PR 컨텍스트 수집** — `gh pr view`, `gh pr diff`, `gh pr checks`, `gh run view`로 PR 메타데이터, diff, exact current-head CI check/run identity를 읽고 canonical worker verification receipts and evidence from `worker.completed`를 reviewer 입력에 포함한다.
2. **패키지 식별** — PR 파일 경로에서 `packages/<name>/`을 추출하여 영향받는 패키지를 식별한다.
3. **병렬 검토 dispatch** — 세 개의 필수 reviewer를 병렬로 호출한다:
   - `@ilokesto-contract-reviewer` — 공개 API 및 계약 위반
   - `@ilokesto-code-reviewer` — 버그, 타입 안전성, 구현 품질
   - `@ilokesto-verification-reviewer` — 테스트 커버리지 및 검증
4. **docs-release 검토** — consumer-facing 변경이 있으면 `docs_release_required: true`로 선언하고 `@ilokesto-docs-release-reviewer`를 추가로 호출하여 결과를 `reviewers.docs_release`에 둔다. 그렇지 않으면 `docs_release_required: false`이고 `reviewers.docs_release` 키를 생략한다.
5. **판정 집계** — `contract`, `code`, `verification`과, `docs_release_required: true`일 때의 `docs_release` 상태를 모두 집계한다:
   - 모두 `PASS`이고 checks가 통과하면 aggregate outcome은 `merge`
   - 하나라도 `BLOCK`이면 aggregate outcome은 `block`
   - `BLOCK` 없이 하나라도 `NEEDS_HUMAN_CHECK`이면 aggregate outcome은 `needs-human-check`
6. **blocker 수집** — aggregate outcome이 `block` 또는 `needs-human-check`인 경우 각 reviewer의 finding을 blocker로 수집한다.
7. **보고** — Supervisor가 검증할 수 있는 machine-readable `review.completed` receipt envelope/payload를 반환한다. 이 command 자체는 receipt를 persist하지 않는다.

Reviewer는 changed repository code, package script, `actionlint`, Changesets command를 로컬에서 실행하지 않는다. Required exact-head CI 또는 canonical worker verification evidence가 없거나 stale이면 reviewer는 `BLOCK`하며 local execution으로 대체하지 않는다.

## 검증 게이트

PR 검토 전에:

- CI checks가 exact reviewed head SHA에 바인딩되어 통과했는지 확인한다 (`gh pr checks`, `gh run view`). 실패하거나 head/run identity가 stale이면 `block: ci-failed`로 보고한다.
- canonical worker verification receipts의 command, repository-relative cwd, exit code, head SHA, evidence digest, artifact basename이 현재 review 입력과 일치하는지 확인한다. 누락 또는 불일치는 `BLOCK`이다.
- changeset이 필요한 consumer-facing 변경에 changeset이 있는지 확인한다.

## 출력 계약

```
version: 1
receipt_id: <receipt-id>
event: review.completed
lane_id: <lane-id>
item_id: <item-id>
attempt: <attempt>
dispatch_id: <dispatch-id>
producer: supervisor after all reviewers
expected_revision: <revision>
repository: <owner/name>
base_branch: <base-branch>
created_at: <timezone-aware ISO-8601>
pr_number: <integer>
head_sha: <40-character SHA>
payload:
  outcome: merge | block | needs-human-check
  reviewed_head_sha: <40-character SHA>
  docs_release_required: false
  checks:
    - name: <check-name>
      run_id: <run-id>
      status: PASS
      head_sha: <40-character SHA>
  reviewers:
    contract: { status: PASS, receipt_id: review-contract-1, evidence_sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, artifact_basename: task-10-contract.txt }
    code: { status: PASS, receipt_id: review-code-1, evidence_sha256: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, artifact_basename: task-10-code.txt }
    verification: { status: PASS, receipt_id: review-verification-1, evidence_sha256: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc, artifact_basename: task-10-verification.txt }
  blocker_signatures: []
  fix_back_eligible: false
  remaining_fix_back_attempts: 0
  non_fixable_evidence: []
```

docs-release 검토가 필요한 경우 payload는 같은 exact-key 계약에서 다음과 같이 네 reviewer를 포함한다:

```yaml
payload:
  outcome: block
  reviewed_head_sha: <40-character SHA>
  docs_release_required: true
  checks:
    - name: <check-name>
      run_id: <run-id>
      status: PASS
      head_sha: <40-character SHA>
  reviewers:
    contract: { status: PASS, receipt_id: review-contract-2, evidence_sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, artifact_basename: task-10-contract.txt }
    code: { status: PASS, receipt_id: review-code-2, evidence_sha256: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, artifact_basename: task-10-code.txt }
    verification: { status: PASS, receipt_id: review-verification-2, evidence_sha256: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc, artifact_basename: task-10-verification.txt }
    docs_release: { status: BLOCK, receipt_id: review-docs-release-2, evidence_sha256: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd, artifact_basename: task-10-docs-release.txt }
  blocker_signatures: [docs_release:missing-changeset]
  fix_back_eligible: true
  remaining_fix_back_attempts: 2
  non_fixable_evidence: []
```

Recovery fields are outcome-dependent and retain these exact payload keys:

```text
merge: blocker_signatures [], fix_back_eligible false, remaining_fix_back_attempts 0, non_fixable_evidence []
block: blocker_signatures [<at least one signature>], fix_back_eligible true, remaining_fix_back_attempts <positive integer>, non_fixable_evidence []
needs-human-check: blocker_signatures [], fix_back_eligible false, remaining_fix_back_attempts 0, non_fixable_evidence [<at least one evidence reference>]
```

## 권한 경계

- 이 커맨드는 읽기 전용이다. 파일을 편집하지 않는다.
- PR을 merge/close/edit/review하지 않는다.
- 브랜치를 삭제하거나 worktree를 정리하지 않는다.
- 검증된 receipt만 보고하고, Supervisor가 `execute-lane` 경계에서 canonical CLI를 통해 append한다. 이 command는 merge 결정이나 receipt persistence를 직접 수행하지 않는다.

## 금지 사항

- reviewer가 파일을 편집하지 않는다.
- `gh pr merge`, `gh pr review`, `gh pr close`, `gh pr edit`를 실행하지 않는다.
- 추측성 판정을 내리지 않는다; 모든 finding에 증거가 있어야 한다.
