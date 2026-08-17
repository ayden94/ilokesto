---
description: execute-lane — lane ledger를 소비하여 패키지별 /issue-to-pr를 dispatch하고 완료된 PR부터 /pr-to-merge 검토, fix-back, merge gate를 진행하는 실행 조율 하네스
argument-hint: "<lane-id|lane-ledger-path> [resume] [--full-auto] [base-branch]"
---

# execute-lane

이 커맨드는 `/create-lane`이 생성한 lane ledger를 소비하여 패키지별 `/issue-to-pr`를 dispatch하고, 먼저 완료된 PR부터 `/pr-to-merge` 검토, fix-back, merge gate를 진행하는 실행 조율 하네스다.

## 사용법

```
/execute-lane <lane-id|lane-ledger-path> [base-branch]
/execute-lane <lane-id> resume
/execute-lane <lane-id> --full-auto [base-branch]
```

예시:

```
/execute-lane store-audit-2026-08-17
/execute-lane .omo/lanes/store-audit-2026-08-17.json main
/execute-lane store-audit-2026-08-17 resume
/execute-lane store-audit-2026-08-17 --full-auto main
```

## 하네스 책임

1. **lane ledger 로드** — `.omo/lanes/<lane-id>.json`을 읽고 `status: pending`인 item을 식별한다.
2. **의존성 순서 dispatch** — `depends_on`이 해소된 item부터 `/issue-to-pr`에 위임한다. 같은 `parallel_group`의 item은 병렬로 dispatch할 수 있다.
3. **완료 수집** — 각 `/issue-to-pr` 완료 보고를 수신하면 즉시 lane item의 `status`를 `pr-open`으로 업데이트한다. 전체 batch를 기다리지 않는다 (per-lane progress).
4. **PR 검토** — `status: pr-open`인 item에 대해 `/pr-to-merge`를 실행한다.
5. **fix-back** — `/pr-to-merge`가 `block`을 반환하면 동일 worktree로 `/issue-to-pr --fix-back`를 재진입한다. 최대 3회.
6. **merge gate** — `--full-auto`이고 `authority_scope.pr_merge=true`인 경우에만 merge를 진행한다. 기본 동작은 검토까지만.
7. **cleanup gate** — merge가 확인된 경우에만 cleanup을 고려한다. 기본 동작은 cleanup 수행하지 않음.
8. **상태 업데이트** — 각 단계마다 lane ledger의 item 상태를 업데이트한다.

## Per-lane progress (no global batch barrier)

- 여러 lane item을 동시에 dispatch하더라도 먼저 완료된 item부터 PR collection, `/pr-to-merge`, fix-back/merge gate를 진행한다.
- 전체 lane batch 완료를 기다린 뒤 일괄 처리하지 않는다.
- child completion barrier는 해당 lane item의 완료 보고를 요구하는 lane-local barrier로만 해석된다.

## Fix-back 계약

`/pr-to-merge`가 `block` verdict를 반환하면:

```yaml
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

`FIX_BACK_ATTEMPT`가 3을 초과하면 `needs-human-check`로 보고하고 해당 item을 일시정지한다.

## Full-auto mode

`--full-auto`는 lane ledger에 다음이 기록된 경우에만 유효하다.

```json
{
  "authority_scope": {
    "pr_merge": true,
    "pr_merge_method": "squash"
  }
}
```

- child command verdict가 `block`이거나 unresolved `needs-human-check`이면 merge/publish로 넘어가지 않는다.
- local publish는 항상 금지.
- dirty cleanup/root sync를 우회하지 않는다.

## 권한 경계

- 기본 동작은 PR 생성까지만. merge/cleanup은 명시적 권한 필요.
- `npm publish`/`pnpm publish` 절대 금지.
- `main`에 직접 push하지 않는다.
- lane scope를 재해석하거나 새 issue를 등록하지 않는다.

## 출력 계약

```
lane_id: <lane-id>
base_branch: <base-branch>
items:
  - issue: <issue-url>
    package: <package-name>
    status: pending | pr-open | approved | merged | blocked | needs-human-check
    pr: <pr-url or none>
    fix_back_result: <remediated|still-blocked|needs-human-check|not-applicable>
    remaining_blockers: <list or none>
ledger: .omo/lanes/<lane-id>.json
```

## 금지 사항

- 전체 lane batch barrier를 구성하지 않는다.
- `block` 또는 unresolved `needs-human-check` 상태에서 merge/publish를 진행하지 않는다.
- local publish를 실행하지 않는다.
- `main`을 직접 cleanup하거나 삭제하지 않는다.