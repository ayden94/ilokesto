---
description: create-lane — /search-issue로 확정된 issue 목록을 의존성과 병렬 실행 가능성을 분석하여 .omo/lanes/<lane-id>.json lane ledger를 생성하는 계획 하네스
argument-hint: "<issue-url|issue-number|search-run-id> [base-branch]"
---

# create-lane

이 커맨드는 `/search-issue`로 확정된 issue 목록을 입력받아 의존성 그래프와 병렬 실행 가능성을 분석한 뒤 `.omo/lanes/<lane-id>.json` lane ledger를 생성하는 계획 하네스다.

## 사용법

```
/create-lane <issue-url|issue-number|search-run-id> [base-branch]
/create-lane <issue-url> <issue-url> ... [base-branch]
```

예시:

```
/create-lane 123
/create-lane 123 456 789
/create-lane .omo/search-runs/2026-08-17-store-audit.json
/create-lane 123 main
```

## 하네스 책임

1. **입력 해석** — issue URL/번호 또는 search-run ledger 경로를 해석한다.
2. **이슈 컨텍스트 수집** — `gh issue view`로 각 issue의 title/body/labels를 읽는다.
3. **패키지 매핑** — issue labels에서 `package:<name>`을 추출하거나 본문에서 패키지를 유추한다.
4. **의존성 분석** — `ilokesto-ecosystem-map` 스킬의 의존성 그래프로 순서를 정한다. `store` 변경이 먼저, `overlay` 변경이 그 다음, `modal`/`toast`가 마지막.
5. **병렬 그룹핑** — 의존성이 없는 issue는 병렬 실행 가능한 lane item으로 묶는다.
6. **lane ledger 생성** — `.omo/lanes/<lane-id>.json`에 다음 구조로 기록한다.

```json
{
  "lane_id": "<lane-id>",
  "base_branch": "<base-branch>",
  "created_at": "<ISO-8601>",
  "items": [
    {
      "issue_url": "<issue-url>",
      "issue_number": <number>,
      "package": "<package-name>",
      "branch_name": "issue-<number>-<short-title>",
      "worktree_path": "<repo-root>/.worktrees/issue-<number>-<short-title>",
      "depends_on": ["<other-issue-number>"],
      "parallel_group": <group-number>,
      "status": "pending"
    }
  ]
}
```

7. **lane 파일만 생성** — 이 커맨드는 구현, 리뷰, merge를 수행하지 않는다. `/execute-lane`에 인계한다.

## 권한 경계

- 파일을 편집하지 않는다 (ledger 작성은 `write` 도구 사용).
- branch/worktree를 생성하지 않는다.
- issue를 생성/수정/닫지 않는다.
- PR을 생성하지 않는다.

## 출력 계약

```
lane_id: <lane-id>
base_branch: <base-branch>
items:
  - issue: <issue-url>
    package: <package-name>
    branch: issue-<number>-<short-title>
    parallel_group: <group-number>
    depends_on: [<issue-numbers>]
ledger: .omo/lanes/<lane-id>.json
next: /execute-lane <lane-id>
```

## 금지 사항

- lane scope를 재해석하거나 새 issue를 등록하지 않는다.
- 의존성이 있는 issue를 같은 병렬 그룹에 넣지 않는다.
- `main`에 직접 commit하거나 push하지 않는다.