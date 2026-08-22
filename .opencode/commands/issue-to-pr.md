---
description: issue-to-pr — GitHub issue 1개를 전용 .worktrees/<branch>에서 구현하거나 기존 PR을 fix-back하도록 위임하고 검증, 커밋, PR 생명주기를 조율하는 ilokesto 실행 하네스
argument-hint: "<github-issue-url|issue-number> [base-branch] [--fix-back <pr-url|pr-number> <branch-name> <worktree-path>]"
agent: ilokesto-workflow-supervisor
---

# issue-to-pr

Workflow state, receipts, authority, and evidence follow `ilokesto-workflow-governance`; this command defines only the supervisor-to-implementer handoff boundary.

```workflow-command-contract
{
  "version": 1,
  "command": "issue-to-pr",
  "owner": "supervisor",
  "supervisor_operations": ["worktree.create", "branch.push", "pr.create", "pr.update", "ledger.append"],
  "worker_operations": ["edit", "test", "commit"],
  "worker_output": "worker.completed",
  "supervisor_receipts": ["worker.started", "worker.completed", "pr.opened", "pr.updated", "item.blocked"],
  "child_recovery": ["same-session-request-once", "read-only-reconcile", "blocked-child-contract-error"]
}
```

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
5. **branch/worktree 준비** — 신규 구현이면 `supervisor-boundary.mjs base-worktree`로 exact origin base SHA에서 branch와 전용 worktree를 만든다. fix-back이면 기존 것을 재사용한다.
6. **구현 위임** — direct task dispatch를 사용하지 않는다. Canonical handoff JSON을 `.omo/inbox/worker-<issue>.json`에 쓴 뒤 root-owned `implementer-launcher.mjs`로 선택된 implementer를 시작한다.
7. **검증 확인** — implementer 보고와 repository state를 기준으로 검증 통과를 확인한다.
8. **커밋 확인** — `Co-Authored-By` trailer가 없는지 확인한다.
9. **push/PR 경계** — exact committed head를 `branch-push`로 올리고, 신규 구현은 `pr-create`, fix-back은 `pr-update`로 `Closes #<issue-number>`가 포함된 canonical inbox body/title를 적용한 뒤 live PR identity를 재검사한다.
10. **보고** — issue, branch, base branch, worktree, PR URL, 검증 요약, cleanup 상태, fix-back 여부를 보고한다.

## branch/worktree 규칙

```text
node scripts/workflow/supervisor-boundary.mjs base-worktree <owner/name> <base-branch> <remote-full-sha> issue-<number>-<short-title> .worktrees/issue-<number>-<short-title>
node scripts/workflow/supervisor-boundary.mjs branch-push <owner/name> issue-<number>-<short-title> <committed-full-sha>
node scripts/workflow/supervisor-boundary.mjs pr-create <owner/name> <base-branch> issue-<number>-<short-title> <committed-full-sha> <issue-number> .omo/inbox/pr-<issue>-title.txt .omo/inbox/pr-<issue>-body.md
node scripts/workflow/supervisor-boundary.mjs pr-update <owner/name> <pr-number> <base-branch> issue-<number>-<short-title> <committed-full-sha> <issue-number> .omo/inbox/pr-<issue>-title.txt .omo/inbox/pr-<issue>-body.md
```

- `base-worktree`는 canonical origin repository, exact remote base SHA, non-existing local branch, and non-existing one-segment worktree를 검증하며 raw `git fetch`/`git worktree add`는 허용하지 않는다.
- `branch-push`는 하나의 validated `issue-*` ref와 expected local SHA만 허용한다. Multi-ref, extra refspec, and flags are rejected.
- PR wrappers bind repository/base/branch/head/issue and read title/body only from direct regular `.omo/inbox/` files. Extra flags, path escapes, and raw `gh pr create/edit` are rejected.
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

Root-owned launcher와 OpenCode의 `--dir`을 direct-tool boundary로 사용한다. Root-loaded implementer profile은 `edit: deny`이며 직접 Git stage/commit 또는 package script 실행 권한이 없다. Launcher만 matching role의 edit과 trusted root VCS/verifier wrapper를 고정 config로 허용한다. Child project root와 `external_directory: deny`가 direct OpenCode file tools를 제한하고, allowed verifier descendants는 별도의 Darwin `/usr/bin/sandbox-exec` policy가 exact assigned worktree 밖의 write를 OS 수준에서 거부한다.

```bash
node scripts/workflow/implementer-launcher.mjs ilokesto-scoped-implementer .worktrees/issue-<number>-<short-title> .omo/inbox/worker-<issue>.json
node scripts/workflow/implementer-launcher.mjs ilokesto-ui-implementer .worktrees/issue-<number>-<short-title> .omo/inbox/worker-<issue>.json

# Same validated assignment, optional continuation only:
node scripts/workflow/implementer-launcher.mjs <exact-role> .worktrees/issue-<number>-<short-title> .omo/inbox/worker-<issue>.json ses_<id>
```

- Launcher는 exact role, canonical `.worktrees/issue-*` one-segment path, Git에 등록된 realpath, symlink 부재, matching branch/worktree handoff, control-character 부재, optional `ses_*`만 허용한다.
- Handoff는 canonical compact single-line JSON이며 `.omo/inbox/`의 direct regular file이다. Alternate config/agent/flag passthrough는 없다.
- Launcher는 fixed supervisor tool location에서 canonical OpenCode/Node/pnpm/Bun executable을 resolve하고, absolute OpenCode executable과 `shell: false`로 `--dir`, matching `--agent`, `--format json`, optional validated `--session`, one handoff argument를 직접 구성한다. Child environment는 explicit allowlist이며 supervisor의 token, runtime option, Git control, arbitrary PATH를 상속하지 않는다.
- Child는 trusted root `implementer-vcs.mjs`와 `implementer-verify.mjs`만 호출한다. Direct `git add`, `git commit`, mutable `package.json` script execution은 허용되지 않는다.
- Launcher는 clean primary index와 stale approved-index state 부재를 요구한다. VCS wrapper는 root-owned single-link private index에만 stage하고 device/inode와 exact path/status/tree를 기록한다. Commit은 primary index lock을 획득하고 present standard hooks를 `--ignore-missing`으로 실행한 뒤 approved tree를 재검증하며, `git update-ref <assigned-ref> <new-commit> <launch-head>` CAS에 성공한 경우에만 approved index를 primary index로 설치한다.
- Verifier는 fixed argv, canonical trusted executable path, strict non-inherited environment, 내부 생성 deny-default sandbox profile만 사용하고 HOME/TMP/cache를 assigned worktree 안에 둔다. Global file metadata만 허용하며 content read는 assigned worktree, exact trusted config/tool, canonical dependency/tool/cache roots, narrow system runtime files로 제한한다. Darwin 또는 `/usr/bin/sandbox-exec`가 없으면 unsandboxed 실행 없이 fail closed한다.
- Supervisor의 `task` permission은 deny-all 뒤 다섯 reviewer 이름만 allow한다. Implementer와 near-match dispatch는 모두 deny다.

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
