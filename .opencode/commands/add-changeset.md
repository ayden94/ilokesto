---
description: add-changeset — 현재 패키지 또는 지정 패키지에 루트 changeset을 추가하는 하네스
argument-hint: "[package-name] [patch|minor|major] <summary>"
---

# add-changeset

이 커맨드는 현재 작업 중인 패키지 또는 지정된 패키지에 대해 루트 `.changeset/*.md` 파일을 추가하는 하네스다. `ilokesto-release` 스킬과 `ilokesto-release-governance` 스킬을 로드한다.

## 사용법

```
/add-changeset [package-name] [patch|minor|major] <summary>
```

인자가 없으면 `pnpm changeset`을 대화형으로 실행한다.

예시:

```
/add-changeset store patch "Fix selector subscription edge case when listener unsubscribes during notification"
/add-changeset modal minor "Add top-left and top-right position variants"
/add-changeset fetcher major "Replace flat shortcut aliases with grouped params contract"
```

## 하네스 책임

1. **패키지 식별** — 인자가 있으면 해당 패키지, 없으면 현재 작업 디렉토리에서 `packages/<name>/`을 유추한다.
2. **semver 검증** — `ilokesto-release-governance` 스킬의 semver 정책에 따라 bump가 변경 유형과 일치하는지 확인한다.
3. **changeset 작성** — `.changeset/<random-name>.md` 파일을 작성한다.
4. **검증** — changeset이 올바른 형식인지 확인한다.

## changeset 형식

```markdown
---
"@ilokesto/<package-name>": <patch|minor|major>
---

<summary>
```

## 권한 경계

- `.changeset/` 디렉토리에만 파일을 작성한다.
- `package.json`의 버전을 직접 변경하지 않는다; Changesets 워크플로가 처리한다.
- `npm publish`/`pnpm publish`를 실행하지 않는다.
- GitHub Actions workflow를 직접 트리거하지 않는다.

## 금지 사항

- 패키지 로컬 changeset config를 생성하지 않는다.
- consumer-facing 변경이 아닌 경우 changeset을 강제하지 않는다 (docs-only 등).
- major changeset에 migration notes 없이 작성하지 않는다.