---
description: search-issue — ilokesto 패키지에서 목적 기반 감사 또는 R&D를 수행하여 issue 후보를 작성하고 등록 심사를 거쳐 사용자 승인 시에만 GitHub issue를 생성하는 읽기 전용 발굴 하네스
argument-hint: "<package-name|all> <purpose> [--register]"
---

# search-issue

이 커맨드는 ilokesto 모노레포의 패키지에서 목적 기반 감사 또는 R&D를 수행하여 issue 후보를 작성하는 읽기 전용 발굴 하네스다. 기본 동작은 issue draft까지만 생성하고, `--register` 플래그가 있어도 등록 심사와 사용자 최종 확인을 통과해야 GitHub issue를 생성한다.

## 사용법

```
/search-issue <package-name|all> <purpose> [--register]
```

지원 목적:

- `bug` — 버그 및 품질 문제 탐지
- `contract-api` — 공개 API 및 계약 위반
- `architecture` — 패키지 의존성 경계 위반
- `tests-edge` — 테스트 커버리지 및 edge case 갭
- `docs` — 문서 동기화 및 구조 문제
- `release-impact` — 릴리스 영향 및 changeset 누락
- `feature-rd` — 기능 R&D (rd_brief 산출)
- `comprehensive` — contract + code + verification 종합

예시:

```
/search-issue store contract-api
/search-issue all comprehensive
/search-issue modal bug --register
/search-issue fetcher feature-rd
```

## 하네스 책임

1. **대상 해석** — 패키지 이름 또는 `all`을 해석한다. `all`인 경우 `ilokesto-ecosystem-map` 스킬의 패키지 그룹을 순회한다.
2. **목적 라우팅** — `ilokesto-issue-audit` 스킬의 Purpose Routing 표에 따라 reviewer 에이전트를 선택한다.
3. **병렬 감사** — 각 패키지에 대해 할당된 reviewer를 병렬로 dispatch한다. reviewer는 패키지 1개만 감사한다.
4. **결과 수집** — `audit_finding` 또는 `rd_brief`를 수집한다.
5. **중복 확인** — `gh search issues`와 `gh search code`로 기존 issue/PR 중복을 확인한다.
6. **issue draft 작성** — 각 발견을 issue draft로 변환한다. 라벨은 `ilokesto-issue-audit` 스킬의 Label Allowlist를 준수한다.
7. **등록 심사** — `@ilokesto-issue-registration-reviewer`에게 draft를 전달하여 `register | defer | reject` 판정을 받는다.
8. **사용자 확인** — `register` 판정을 받은 draft만 사용자에게 목록으로 보여주고 생성 여부를 확인받는다.
9. **issue 생성** — 사용자가 승인한 경우에만 `gh issue create`로 issue를 생성한다.
10. **기록** — 감사 결과와 판정을 `.omo/search-runs/<run-id>.json`에 기록한다.

## 권한 경계

- 이 커맨드의 reviewer는 모두 읽기 전용(`edit: deny`)이다.
- `gh issue create`는 사용자 명시 승인 후에만 실행한다.
- `--register`가 없으면 draft까지만 작성하고 issue 생성을 시도하지 않는다.
- security-sensitive 발견은 issue로 등록하지 않고 비공개 채널을 안내한다.
- support/usage question은 issue draft에서 제외한다.

## 출력 계약

최종 보고는 한국어로 작성하고 다음 값을 포함한다.

```
search_run_id: <run-id>
package(s): <package-name or all>
purpose: <purpose>
drafts:
  - draft_id: <id>
    title: <issue title>
    package: <package-name>
    verdict: register | defer | reject
    reason: <reason>
    duplicate_of: <issue-url or none>
registered:
  - <issue-url> or none
ledger: .omo/search-runs/<run-id>.json
```

## 금지 사항

- `gh issue create`를 사용자 승인 없이 실행하지 않는다.
- `defer` 또는 `reject` 판정을 받은 draft를 issue로 생성하지 않는다.
- security-sensitive 발견을 공개 issue로 생성하지 않는다.
- 파일을 편집하지 않는다 (reviewer는 읽기 전용).
- `.omo/search-runs/` 외부에 ledger를 작성하지 않는다.