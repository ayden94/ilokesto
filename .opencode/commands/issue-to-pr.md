---
description: issue-to-pr — GitHub issue 1개를 전용 .worktrees/<branch>에서 구현하거나 기존 PR을 fix-back하도록 위임하고 검증, 커밋, PR 생명주기를 조율하는 ilokesto 실행 하네스
argument-hint: "<github-issue-url|issue-number> [base-branch] [--fix-back <pr-url|pr-number> <branch-name> <worktree-path>]"
---

# issue-to-pr

이 커맨드는 issue/branch/worktree/PR 생명주기를 정리하고 실제 구현은 `@ilokesto-scoped-implementer` 또는 `@ilokesto-ui-implementer`에 위임하는 얇은 실행 하네스다.

## 사용법

```
/issue-to-pr <github-issue-url|issue-number> [base-branch]
/issue-to-pr <github-issue-url|issue-number> [base-branch] --fix-back <pr-url|pr-number> <branch-name> <worktree-path>
```

예시:

```
/issue-to-pr 123
/issue-to-pr 123 main
/issue-to-pr https://github.com/ilokesto/ilokesto/issues/123
/issue-to-pr 123 main --fix-back 456 issue-123-store-selector .worktrees/issue-123-store-selector
```

## 하네스 책임

1. **대상 해석** — GitHub issue URL 또는 issue number를 해석하고 base branch를 결정한다. 기본값 `main`.
2. **이슈 컨텍스트 수집** — `gh issue view`로 title/body/labels를 읽는다.
3. **패키지 식별** — issue labels에서 `package:<name>`을 추출하거나 본문에서 패키지를 유추한다.
4. **구현자 선택** — `ilokesto-ecosystem-map` 스킬의 라우팅 규칙에 따라:
   - `store`, `state`, `form` core, `fetcher` → `@ilokesto-scoped-implementer`
   - `overlay`, `modal`, `toast`, `utilinent`, `form` 어댑터 → `@ilokesto-ui-implementer`
5. **branch/worktree 준비** — 신규 구현이면 branch와 전용 worktree를 만든다. fix-back이면 기존 것을 재사용한다.
6. **구현 위임** — 선택된 implementer에 `ISSUE_URL`, `WORKTREE_PATH`, `BRANCH_NAME`, `BASE_BRANCH`, `MODE`를 전달한다.
7. **검증 확인** — implementer 보고와 repository state를 기준으로 검증 통과를 확인한다.
8. **커밋 확인** — `Co-Authored-By` trailer가 없는지 확인한다.
9. **PR 생성 확인** — 신규 구현이면 `Closes #<issue-number>`를 포함한 PR body로 PR이 열렸는지 확인한다.
10. **보고** — issue, branch, base branch, worktree, PR URL, 검증 요약, cleanup 상태, fix-back 여부를 보고한다.

## branch/worktree 규칙

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
BASE_BRANCH="${BASE_BRANCH:-main}"
BRANCH_NAME="issue-<number>-<short-title>"
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${BRANCH_NAME}"

git fetch origin
git worktree add -b "${BRANCH_NAME}" "${WORKTREE_PATH}" "origin/${BASE_BRANCH}"
```

- 신규 구현에서 기존 branch/worktree가 충돌하면 자동으로 덮어쓰지 말고 중단한다.

### Fix-back mode

필수 입력:

```yaml
ISSUE_URL: <resolved-issue-url>
ISSUE_NUMBER: <issue-number>
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

Fix-back 규칙:

- `EXISTING_PR` head branch가 `BRANCH_NAME`과 일치해야 한다.
- 새 branch/worktree/PR/issue를 만들지 않는다.
- `BLOCKERS`에 포함된 항목만 최소 수정한다.
- 결과는 `fix_back_result: remediated|still-blocked|needs-human-check`로 보고한다.

## 구현 위임 계약

```
@ilokesto-scoped-implementer  (또는 @ilokesto-ui-implementer)

ISSUE_URL: <resolved-issue-url>
ISSUE_NUMBER: <issue-number>
ISSUE_TITLE: <issue-title>
BASE_BRANCH: <base-branch>
BRANCH_NAME: issue-<number>-<short-title>
WORKTREE_PATH: <repo-root>/.worktrees/<branch-name>
MODE: new-pr | fix-back
EXISTING_PR: <pr-url-or-number | 없음>
BLOCKERS: <fix-back mode에서만 필수>

Rules:
- Work only inside WORKTREE_PATH.
- Load ilokesto-<package> skill before editing.
- Read packages/<name>/AGENTS.md, root AGENTS.md, PACKAGES.md, ARCHITECTURE.md before editing.
- Include docs/tests with behavior changes.
- Add .changeset/*.md for public @ilokesto/* package consumer-facing changes.
- Run changed-file diagnostics and the closest relevant verifier.
- Commit on BRANCH_NAME without any Co-Authored-By trailer.
- Do not push, open PRs, merge, close, or clean up branches/worktrees.
```

## 검증 게이트

PR 생성 또는 fix-back 완료 보고 전에:

- changed files 대상 diagnostics가 통과했다.
- 패키지 검증 명령이 통과했다:
  - `pnpm --filter @ilokesto/<name> typecheck`
  - `pnpm --filter @ilokesto/<name> test`
  - `pnpm --filter @ilokesto/<name> build`
  - `fetcher`인 경우 `pnpm --filter @ilokesto/fetcher test:dist` 추가
  - `modal`인 경우 `test:a11y`, `test:e2e`, `test:pack` 추가
- public `@ilokesto/*` package 변경에 `.changeset/*.md`가 있거나 no-release 근거가 있다.
- 커밋 메시지에 `Co-Authored-By` trailer가 없다.

## merge/cleanup 권한 경계

- 기본 결과는 **PR 생성 완료**다.
- 이 커맨드는 기본 동작으로 merge, PR close, branch 삭제, `git worktree remove`, remote branch 삭제를 수행하지 않는다.
- merge/cleanup은 별도 사용자 명시 승인, `/pr-to-merge`, 또는 `/execute-lane` authority gate가 있을 때만 수행한다.

## 출력 계약

```
result: PR 생성 완료 | fix-back 완료 | blocked-child-contract-error
linked issue: <issue-url>
package: <package-name>
branch: <branch-name>
base branch: <base-branch>
worktree: <repo-root>/.worktrees/<branch-name>
PR URL: <pull-request-url>
mode: new-pr | fix-back
fix_back_result: <remediated|still-blocked|needs-human-check|not-applicable>
addressed blockers: <해결한 blocker 목록 또는 not-applicable>
remaining blockers: <남은 blocker 목록 또는 없음>
verification summary: <diagnostics/tests/build 결과 요약>
cleanup status: 수행하지 않음 — 별도 명시 승인 또는 상위 gate 필요
```