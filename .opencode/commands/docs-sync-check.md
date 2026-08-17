---
description: docs-sync-check — 패키지 docs 폴더의 Fumadocs 구조, 이중언어 README, .npmignore 제외 여부를 읽기 전용으로 검증하는 하네스
argument-hint: "[package-name]"
---

# docs-sync-check

이 커맨드는 패키지 docs 폴더의 Fumadocs 구조 준수, 이중언어 README 동기화, `.npmignore` 제외 여부를 읽기 전용으로 검증하는 하네스다. `ilokesto-docs-sync` 스킬과 `ilokesto-docs-governance` 스킬을 로드한다.

## 사용법

```
/docs-sync-check [package-name]
```

패키지 이름을 생략하면 모든 패키지를 순회한다.

예시:

```
/docs-sync-check store
/docs-sync-check modal
/docs-sync-check
```

## 하네스 책임

1. **패키지 해석** — 인자가 있으면 해당 패키지, 없으면 `packages/*`를 순회한다.
2. **`@ilokesto-docs-release-reviewer` dispatch** — 각 패키지에 대해 docs-release reviewer를 호출한다.
3. **검증 항목** — `ilokesto-docs-governance` 스킬의 checklist를 기준으로:
   - `packages/<name>/docs/` Fumadocs 구조 (`meta.json`, `*.mdx`, `*.ko.mdx`)
   - `README.md`와 `README.ko.md` 동기화
   - `packages/<name>/.npmignore`에 `docs/` 제외
4. **보고** — 각 패키지별 검증 결과와 갭을 보고한다.

## 출력 계약

```
package: <package-name>
docs structure: pass | fail
  - meta.json: present | missing
  - *.mdx: <count> files
  - *.ko.mdx: <count> files
  - sync: in-sync | out-of-sync
bilingual readme: in-sync | out-of-sync
npmignore docs exclusion: pass | fail
verdict: approve | block | needs-human-check
findings:
  - severity: P0 | P1 | P2
    evidence: <file-path:line>
    problem: <description>
    docs_book_impact: <none|needs-check|docs-required>
```

## 권한 경계

- 읽기 전용. 파일을 편집하지 않는다.
- `ilokesto/docs` 저장소를 직접 편집하지 않는다.
- `sync-docs.yml` workflow를 직접 트리거하지 않는다.
- docs 갭만 보고하고 수정은 별도 작업으로 수행한다.