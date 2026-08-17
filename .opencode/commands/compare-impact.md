---
description: compare-impact — 패키지 scope 또는 변경의 크로스 패키지 영향을 분석하여 읽기 전용 보고서를 반환하는 하네스
argument-hint: "<package-name> [scope|impact]"
---

# compare-impact

이 커맨드는 패키지 scope 또는 변경의 크로스 패키지 영향을 분석하여 읽기 전용 보고서를 반환하는 하네스다. `ilokesto-compare` 스킬과 `ilokesto-ecosystem-map` 스킬을 로드한다.

## 사용법

```
/compare-impact <package-name> [scope|impact]
```

- `scope` (기본값) — 패키지 scope와 비교 가능한 오픈소스 라이브러리를 반환한다.
- `impact` — 패키지 변경이 의존 패키지에 미치는 영향을 분석한다.

예시:

```
/compare-impact store
/compare-impact store scope
/compare-impact store impact
/compare-impact overlay impact
```

## 하네스 책임

1. **패키지 해석** — `packages/<name>/package.json`과 `packages/<name>/README.md`를 읽는다.
2. **scope 분석** — `librarian` background agent로 비교 가능 라이브러리(최소 2개)를 조사한다.
3. **impact 분석** — `ilokesto-ecosystem-map` 스킬의 의존성 그래프로 영향받는 패키지를 추적한다.
4. **보고** — scope 또는 impact 보고서를 반환한다.

## 출력 계약 (scope)

```
package: <package-name>
scope: <one-line scope description>
comparable libraries:
  - <library-name>: <how ilokesto differs>
  - <library-name>: <how ilokesto differs>
```

## 출력 계약 (impact)

```
package: <package-name>
change type: patch | minor | major
affected packages:
  - <package-name>: <dependency reason>
  - <package-name>: <dependency reason>
recommended changeset: patch | minor | major
```

## 권한 경계

- 읽기 전용. 파일을 편집하지 않는다.
- 외부 라이브러리 내부 구조에 대한 확정적 주장을 하지 않는다; 소스를 확인한다.
- 버전 제약을 추측하지 않는다; `package.json`을 읽는다.