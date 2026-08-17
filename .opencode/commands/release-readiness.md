---
description: release-readiness — 패키지 또는 전체 모노레포의 릴리스 준비성을 읽기 전용으로 검증하는 하네스
argument-hint: "[package-name|all]"
---

# release-readiness

이 커맨드는 패키지 또는 전체 모노레포의 릴리스 준비성을 읽기 전용으로 검증하는 하네스다. `ilokesto-release` 스킬과 `ilokesto-release-governance` 스킬을 로드한다.

## 사용법

```
/release-readiness [package-name|all]
```

패키지 이름을 생략하거나 `all`이면 모든 패키지를 순회한다.

예시:

```
/release-readiness store
/release-readiness fetcher
/release-readiness all
```

## 하네스 책임

1. **패키지 해석** — 인자가 있으면 해당 패키지, 없으면 `packages/*`를 순회한다.
2. **`@ilokesto-docs-release-reviewer` dispatch** — 각 패키지에 대해 release reviewer를 호출한다.
3. **검증 항목** — `ilokesto-release-governance` 스킬의 checklist를 기준으로:
   - consumer-facing 변경에 `.changeset/*.md` 존재
   - changeset semver bump가 변경 유형과 일치
   - `pnpm typecheck`, `pnpm test`, `pnpm build` 통과 (명령 실행)
   - `fetcher`의 경우 `pnpm --filter @ilokesto/fetcher test:dist` 통과
   - local publish 명령이 실행되지 않았음
   - major changeset에 migration notes 존재
4. **보고** — 각 패키지별 릴리스 준비성 결과를 보고한다.

## 출력 계약

```
package: <package-name>
changesets:
  - <changeset-file>: <bump> — <summary>
semver check: pass | fail
build check: pass | fail
test check: pass | fail
dist check (fetcher only): pass | fail | not-applicable
local publish detected: no | yes
major migration notes: present | missing | not-applicable
verdict: approve | block | needs-human-check
findings:
  - severity: P0 | P1 | P2
    evidence: <file-path:line>
    problem: <description>
```

## 권한 경계

- 읽기 전용. 파일을 편집하지 않는다.
- `npm publish`/`pnpm publish`를 실행하지 않는다.
- GitHub Actions release workflow를 직접 트리거하지 않는다.
- `package.json` 버전을 변경하지 않는다; Changesets 워크플로가 처리한다.

## 금지 사항

- local publish를 실행하거나 권장하지 않는다.
- release workflow를 직접 dispatch하지 않는다.
- major changeset을 migration notes 없이 approve하지 않는다.