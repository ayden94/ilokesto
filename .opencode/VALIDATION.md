# ilokesto OpenCode Validation Guide

본 문서는 ilokesto 저장소의 OpenCode 에이전트, 커맨드, 스킬 구조가 프로젝트 정책을 준수하는지 검증하기 위한 가이드다.

## 1. 정적 검증 (Static Checks)

새로운 커맨드나 에이전트를 추가/수정했을 때 다음 체크리스트를 확인한다. 워크플로 상태와 receipt 전이의 SSOT는 [`ilokesto-workflow-governance`](skills/ilokesto-workflow-governance/SKILL.md)이며 이 문서는 검증 방법만 설명한다.

### 1.1 필수 파일 및 구조 확인

- [ ] 에이전트 파일이 `.opencode/agents/`에 존재하며 `ilokesto-` 접두사로 시작하는가?
- [ ] 커맨드 파일이 `.opencode/commands/`에 존재하며 `description` frontmatter를 가지고 있는가?
- [ ] 스킬이 `.opencode/skills/ilokesto-*/SKILL.md`에 존재하며 `name`과 `description` frontmatter를 가지고 있는가?
- [ ] command와 같은 이름의 skill이 없는가? 정적 테스트가 모든 command/skill 이름을 비교한다.
- [ ] legacy `.opencode/commands.json`과 `.opencode/agents.md`가 삭제되었는가?

### 1.2 권한 및 경계 검증

- [ ] **Reviewer 에이전트**: frontmatter에 `edit: deny`가 설정되어 있고, `git push`, `git merge`, `git rebase`, `git add`, `git commit`, `git checkout`, `gh issue create`, `gh pr merge`, `gh pr review`, `gh pr close`, `npm publish`, `pnpm publish`가 모두 `deny`인가?
- [ ] **Reviewer 실행 경계**: package script, direct `pnpm`, `actionlint`, Changesets command 실행 권한이 없고, `git diff --no-index`, output/ext-diff/textconv option, absolute path, traversal이 read allow 뒤의 last-match rule로 `deny`되는가?
- [ ] **Reviewer 증거 경계**: 판정은 exact current-head CI checks와 canonical worker verification receipts and evidence만 소비하며, required evidence가 없거나 stale이면 local execution 대신 `BLOCK`하는가?
- [ ] **Implementer 에이전트**: root profile은 `edit: deny`이고 launcher가 할당된 worktree에만 edit을 부여하는가?
- [ ] **Command Harness**: 사용자가 직접 실행하는 `gh issue create`, `gh pr merge`, `npm publish` 등이 하네스 로직에 의해 보호되거나 금지되어 있는가?
- [ ] **명시적 승인/Authority**: high-impact side-effect 실행 시 command harness gate, registration triage, 또는 사용자 컨펌 단계를 거치는가?

### 1.3 불변 정책 준수 (root AGENTS.md)

- [ ] 모든 consumer-facing 변경에 루트 `.changeset/*.md`가 있는가?
- [ ] 로컬 `npm publish` / `pnpm publish` 명령어가 실행되거나 권장되지 않는가?
- [ ] 구현 작업이 `.worktrees/` 디렉토리 내에서 수행되도록 설계되었는가?
- [ ] 커맨드 파일에서 적절한 에이전트(`@ilokesto-*`)나 스킬을 참조하고 있는가?
- [ ] command 이름이 skill 이름과 충돌하지 않는가?
- [ ] 모든 workflow command frontmatter가 `ilokesto-workflow-supervisor`를 가리키는가?
- [ ] 모든 custom role model이 provider-qualified 형식인가?
- [ ] legacy verdict/term은 금지 문구와 negative fixture 밖에서 accepted/emitted 되지 않는가?
- [ ] workflow 문서와 command가 `.omo/lanes/*.json` 직접 편집을 지시하지 않는가?
- [ ] complete state/receipt table은 workflow-governance 외부에 하나도 없는가?
- [ ] canonical platform policy는 [`ilokesto-workflow-governance`](skills/ilokesto-workflow-governance/SKILL.md)의 Linux `/proc/self/fd` 및 Darwin identity-bound `bound-path` 규칙을 참조하며, unsupported platform은 fail closed 하는가?

검증 기준은 governance SSOT의 다음 문장을 그대로 따른다. Linux opens `workspace/.omo/lanes/locks` descriptor-relatively through `/proc/self/fd` and fstats targets. Darwin uses the verified identity-bound `bound-path` strategy because directory traversal through `/dev/fd` is unavailable. Unsupported platforms fail closed.

---

## 2. 안전 드라이런 (Safe Dry-Run) 시나리오

실제 GitHub이나 npm에 영향을 주지 않고 로직을 검증하는 방법이다. 재시작은 persisted receipt와 현재 외부 사실을 reconcile하며 이미 입증된 side effect를 반복하지 않는다.

### 2.1 가짜 PR/이슈 참조 (Fake References)

- `/pr-to-merge 9999` (존재하지 않는 PR 번호로 에러 핸들링 확인)
- `/search-issue nonexistent-package bug` (존재하지 않는 패키지로 error handling 확인)
- `/create-lane 8888` (존재하지 않는 issue로 read-only 조회 실패 확인)
- `/execute-lane missing-lane-id` (존재하지 않는 lane ledger로 error handling 확인)

### 2.2 읽기 전용 모드 (Read-Only Check)

- `/search-issue store contract-api` 실행 시 reviewer가 `edit: deny` 상태에서 분석 결과만 생성하는지 확인.
- `/compare-impact store impact` 실행 시 파일 편집 없이 보고서만 반환하는지 확인.
- `/docs-sync-check` 실행 시 docs-release reviewer가 읽기 전용으로 갭만 보고하는지 확인.
- `/release-readiness` 실행 시 local publish 없이 검증 결과만 반환하는지 확인.
- Reviewer가 changed repository code를 로컬 실행하지 않고 exact current-head CI와 worker verification receipt만 검사하며, 증거가 없거나 stale이면 `BLOCK`하는지 확인.

### 2.3 등록 게이트 모드 (Registration Gate Check)

- `/search-issue store bug` (registration triage가 `register/defer/reject`를 산출하는지 확인. `--register` 없이 issue 생성 시도하지 않는지 확인)
- `/search-issue store bug --register` (사용자 최종 확인 전에 `gh issue create`가 실행되지 않는지 확인)

### 2.4 Fix-back 드라이런

- `/issue-to-pr 123 main --fix-back 9999 issue-123-test .worktrees/issue-123-test` (존재하지 않는 PR/branch로 fix-back 입력 검증)

### 2.5 Canonical workflow

`/search-issue` → `/create-lane` → `/execute-lane`가 표준 순서다. `/execute-lane`은 `/issue-to-pr`와 `/pr-to-merge`를 조율한다. merge, cleanup, root sync는 각각 별도 승인 authority receipt를 한 번만 소비한다.

---

## 3. 금지 사항 (Prohibited for Validation)

다음 작업은 검증 과정에서 절대 수행하지 않는다.

- 실제 `gh issue create` 또는 `gh pr merge` 실행 (dry-run에서는 registration triage 또는 authority gate 직전에 중단)
- 실제 `npm publish` 또는 `pnpm changeset publish` 실행
- GitHub Actions workflow의 실제 `dispatch` 또는 `rerun`
- 공유 브랜치(`main`)의 직접적인 cleanup 또는 삭제
- 드라이런 중 실제 branch 생성 또는 worktree 추가 (상태 변경 방지)
- OpenCode 또는 local command에서 package publish 수행. release는 non-authorizing GitHub Actions handoff에서 멈춘다.
- receipt에 secret, session ID, absolute local path, raw transcript를 기록

---

## 4. 검증 방법 (Validation Methods)

```bash
# 에이전트 권한 설정 확인
grep -r "edit: deny" .opencode/agents/
grep -r "npm publish\*.*deny" .opencode/agents/
grep -r "pnpm publish\*.*deny" .opencode/agents/

# 커맨드-에이전트 참조 일치 확인
grep -r "ilokesto-" .opencode/commands/

pnpm workflow:ledger
pnpm test:workflow
pnpm test:monorepo
pnpm typecheck
node --test tests/monorepo/workflow-documentation-consistency.test.mjs

# command/skill shadow, supervisor ownership, model qualification,
# forbidden vocabulary, and duplicate-table checks are covered by the test above.

# 모든 skill이 frontmatter를 가지는지 확인
for f in .opencode/skills/*/SKILL.md; do
  head -1 "$f" | grep -q "^---$"
done

# 모든 agent가 ilokesto- 접두사를 가지는지 확인
ls .opencode/agents/*.md | grep -v README | while read f; do
  basename "$f" .md | grep -q "^ilokesto-"
done

# legacy 파일이 삭제되었는지 확인
test ! -f .opencode/commands.json
test ! -f .opencode/agents.md
```
