---
description: pr-to-merge — PR 1개를 contract/code/verification reviewer로 병렬 검토하여 approve | block | needs-human-check 판정을 내리는 읽기 전용 검토 하네스
argument-hint: "<pr-url|pr-number>"
---

# pr-to-merge

이 커맨드는 PR 1개를 3개의 독립 reviewer 에이전트로 병렬 검토하여 `approve | block | needs-human-check` 판정을 내리는 읽기 전용 검토 하네스다.

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

1. **PR 컨텍스트 수집** — `gh pr view`, `gh pr diff`, `gh pr checks`로 PR 메타데이터, diff, CI 상태를 읽는다.
2. **패키지 식별** — PR 파일 경로에서 `packages/<name>/`을 추출하여 영향받는 패키지를 식별한다.
3. **병렬 검토 dispatch** — 3개 reviewer를 병렬로 호출한다:
   - `@ilokesto-contract-reviewer` — 공개 API 및 계약 위반
   - `@ilokesto-code-reviewer` — 버그, 타입 안전성, 구현 품질
   - `@ilokesto-verification-reviewer` — 테스트 커버리지 및 검증
4. **docs-release 검토** — consumer-facing 변경이 있는 경우 `@ilokesto-docs-release-reviewer`를 추가로 호출한다.
5. **판정 집계** — 각 reviewer의 verdict를 집계한다:
   - 모두 `approve` → `approve`
   - 하나라도 `block` → `block`
   - `block` 없고 하나라도 `needs-human-check` → `needs-human-check`
6. **blocker 수집** — `block` 또는 `needs-human-check`인 경우 각 reviewer의 finding을 blocker로 수집한다.
7. **보고** — 집계된 판정과 blocker 목록을 보고한다.

## 검증 게이트

PR 검토 전에:

- CI checks가 통과했는지 확인한다 (`gh pr checks`). 실패한 경우 `block: ci-failed`로 보고한다.
- changeset이 필요한 consumer-facing 변경에 changeset이 있는지 확인한다.

## 출력 계약

```
pr: <pr-url>
package(s): <package-name(s)>
verdict: approve | block | needs-human-check
reviewers:
  contract: approve | block | needs-human-check
  code: approve | block | needs-human-check
  verification: approve | block | needs-human-check
  docs-release: approve | block | needs-human-check | not-applicable
blockers:
  - reviewer: <contract|code|verification|docs-release>
    signature: <stable blocker identifier>
    severity: P0 | P1 | P2
    evidence: <file-path:line>
    problem: <description>
    fix_direction: <suggested contract-preserving fix>
fix_back_payload:
  EXISTING_PR: <pr-url-or-number>
  BRANCH_NAME: <pr-head-branch>
  WORKTREE_PATH: <repo-root>/.worktrees/<branch-name>
  BLOCKERS: <blocker list>
```

## 권한 경계

- 이 커맨드는 읽기 전용이다. 파일을 편집하지 않는다.
- PR을 merge/close/edit/review하지 않는다.
- 브랜치를 삭제하거나 worktree를 정리하지 않는다.
- 판정과 blocker만 보고하고, merge 결정은 호출자(`execute-lane` 또는 사용자)가 내린다.

## 금지 사항

- reviewer가 파일을 편집하지 않는다.
- `gh pr merge`, `gh pr review`, `gh pr close`, `gh pr edit`를 실행하지 않는다.
- 추측성 판정을 내리지 않는다; 모든 finding에 증거가 있어야 한다.