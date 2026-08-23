---
description: create-lane — /search-issue의 승인된 source.selected handoff를 canonical lane receipt로 소비하는 계획 하네스
argument-hint: "<issue-url|issue-number|search-run-id> [base-branch]"
agent: ilokesto-workflow-supervisor
---

# create-lane

The state, receipt, authority, and evidence contract is owned by `ilokesto-workflow-governance`.

Canonical creation writes one compact JSON object containing exactly `lane_receipt` and `source_selection` to a direct regular file under `.omo/inbox/`, then calls `node scripts/workflow/lane-ledger-cli.mjs create <lane-id> .omo/inbox/<receipt>.json`. The CLI rejects stdin, traversal, symlinks, nested paths, non-regular files, and alternate flags before validating the exact handoff through `validateLaneCreationFromSourceSelection`. Each item records `hard_dependencies`; source `ordering_after` edges become canonical `ordering_dependencies` without merge ancestry.

Authority remains separate and native approval-gated:

`node scripts/workflow/lane-ledger-cli.mjs authorize <lane-id> --expected-revision <revision> --repository <owner/name> --issues <one-issue-number-or-empty> --operations <one-operation> --squash-method squash`

Each approval grants exactly one operation. `merge` and `cleanup` bind one exact issue number; `root-sync` uses an empty `--issues` value and is lane-scoped.

이 커맨드는 `/search-issue`의 승인된 `source.selected` handoff를 소비하여 의존성 그래프와 병렬 실행 가능성을 분석하는 계획 하네스다. Supervisor가 canonical handoff/receipt 입력을 `.omo/inbox/` direct file로 소유하고, `lane-ledger-cli.mjs create <lane-id> <receipt-file>`을 호출한 뒤 `validate`와 `project`로 결과를 확인한다. lane은 canonical CLI만 persistence하며 command prose는 ledger JSON을 직접 쓰지 않는다.

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

1. **입력 해석** — 승인된 `source.selected` handoff와 canonical lane ID를 해석한다.
2. **이슈 컨텍스트 수집** — `gh issue view`로 각 issue의 title/body/labels를 읽는다.
3. **패키지 매핑** — issue labels에서 `package:<name>`을 추출하거나 본문에서 패키지를 유추한다.
4. **의존성 분석** — `ilokesto-ecosystem-map` 스킬의 의존성 그래프로 순서를 정한다. `store` 변경이 먼저, `overlay` 변경이 그 다음, `modal`/`toast`가 마지막.
5. **병렬 그룹핑** — 의존성이 없는 issue는 병렬 실행 가능한 lane item으로 묶는다.
6. **canonical persistence** — Supervisor가 machine-readable handoff/receipt input을 `.omo/inbox/` direct regular file로 materialize하고 `node scripts/workflow/lane-ledger-cli.mjs create <lane-id> .omo/inbox/<receipt>.json`를 호출한다.

```text
supervisor handoff: .omo/inbox/<lane-id>-create.json
lane id: <lane-id>
create: node scripts/workflow/lane-ledger-cli.mjs create <lane-id> .omo/inbox/<lane-id>-create.json
validate: node scripts/workflow/lane-ledger-cli.mjs validate <lane-id>
project: node scripts/workflow/lane-ledger-cli.mjs project <lane-id>
```

7. **검증 및 인계** — 생성 직후 `validate`와 `project`를 실행한다. 이 커맨드는 구현, 리뷰, merge를 수행하지 않는다. 검증된 lane ID만 `/execute-lane`에 인계한다.

## 권한 경계

- ledger JSON을 직접 작성하거나 편집하지 않는다. persistence는 canonical CLI만 수행한다.
- branch/worktree를 생성하지 않는다.
- issue를 생성/수정/닫지 않는다.
- PR을 생성하지 않는다.

## 출력 계약

Every emitted branch uses `issue-<positive-number>-<lowercase-kebab-slug>`, with the numeric component equal to the item issue number.

```
lane_id: <lane-id>
base_branch: <base-branch>
items:
  - issue: <issue-url>
    package: <package-name>
    branch: issue-<number>-<short-title>
    parallel_group: <group-number>
    depends_on: [<issue-numbers>]
  source_handoff: <source.selected handoff id>
  revision: <validated revision>
next: /execute-lane <lane-id>
```

## 금지 사항

- lane scope를 재해석하거나 새 issue를 등록하지 않는다.
- 의존성이 있는 issue를 같은 병렬 그룹에 넣지 않는다.
- `main`에 직접 commit하거나 push하지 않는다.
