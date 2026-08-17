# ilokesto OpenCode Validation Guide

본 문서는 ilokesto 저장소의 OpenCode 에이전트, 커맨드, 스킬 구조가 프로젝트 정책을 준수하는지 검증하기 위한 가이드다.

## 1. 정적 검증 (Static Checks)

새로운 커맨드나 에이전트를 추가/수정했을 때 다음 체크리스트를 확인한다.

### 1.1 필수 파일 및 구조 확인

- [ ] 에이전트 파일이 `.opencode/agents/`에 존재하며 `ilokesto-` 접두사로 시작하는가?
- [ ] 커맨드 파일이 `.opencode/commands/`에 존재하며 `description` frontmatter를 가지고 있는가?
- [ ] 스킬이 `.opencode/skills/ilokesto-*/SKILL.md`에 존재하며 `name`과 `description` frontmatter를 가지고 있는가?
- [ ] command와 같은 이름의 skill이 없는가? (`search-issue`, `create-lane`, `execute-lane`, `issue-to-pr`, `pr-to-merge`, `compare-impact`, `add-changeset`, `docs-sync-check`, `release-readiness`)
- [ ] legacy `.opencode/commands.json`과 `.opencode/agents.md`가 삭제되었는가?

### 1.2 권한 및 경계 검증

- [ ] **Reviewer 에이전트**: frontmatter에 `edit: deny`가 설정되어 있고, `git push`, `git merge`, `git rebase`, `git add`, `git commit`, `git checkout`, `gh issue create`, `gh pr merge`, `gh pr review`, `gh pr close`, `npm publish`, `pnpm publish`가 모두 `deny`인가?
- [ ] **Implementer 에이전트**: `edit: allow`이되 `git merge`, `git rebase`, `git reset`, `git clean`, `git rm`, `git branch -d/-D`, `git worktree remove`, force push, `npm publish`, `pnpm publish`, `gh issue create`, `gh pr merge`, `gh pr review`, `gh pr close`, `gh pr edit`가 `deny`인가?
- [ ] **Command Harness**: 사용자가 직접 실행하는 `gh issue create`, `gh pr merge`, `npm publish` 등이 하네스 로직에 의해 보호되거나 금지되어 있는가?
- [ ] **명시적 승인/Authority**: high-impact side-effect 실행 시 command harness gate, registration triage, 또는 사용자 컨펌 단계를 거치는가?

### 1.3 불변 정책 준수 (root AGENTS.md)

- [ ] 모든 consumer-facing 변경에 루트 `.changeset/*.md`가 있는가?
- [ ] 로컬 `npm publish` / `pnpm publish` 명령어가 실행되거나 권장되지 않는가?
- [ ] 구현 작업이 `.worktrees/` 디렉토리 내에서 수행되도록 설계되었는가?
- [ ] 커맨드 파일에서 적절한 에이전트(`@ilokesto-*`)나 스킬을 참조하고 있는가?
- [ ] command 이름이 skill 이름과 충돌하지 않는가?

---

## 2. 안전 드라이런 (Safe Dry-Run) 시나리오

실제 GitHub이나 npm에 영향을 주지 않고 로직을 검증하는 방법이다.

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

### 2.3 등록 게이트 모드 (Registration Gate Check)

- `/search-issue store bug` (registration triage가 `register/defer/reject`를 산출하는지 확인. `--register` 없이 issue 생성 시도하지 않는지 확인)
- `/search-issue store bug --register` (사용자 최종 확인 전에 `gh issue create`가 실행되지 않는지 확인)

### 2.4 Fix-back 드라이런

- `/issue-to-pr 123 main --fix-back 9999 issue-123-test .worktrees/issue-123-test` (존재하지 않는 PR/branch로 fix-back 입력 검증)

---

## 3. 금지 사항 (Prohibited for Validation)

다음 작업은 검증 과정에서 절대 수행하지 않는다.

- 실제 `gh issue create` 또는 `gh pr merge` 실행 (dry-run에서는 registration triage 또는 authority gate 직전에 중단)
- 실제 `npm publish` 또는 `pnpm changeset publish` 실행
- GitHub Actions workflow의 실제 `dispatch` 또는 `rerun`
- 공유 브랜치(`main`)의 직접적인 cleanup 또는 삭제
- 드라이런 중 실제 branch 생성 또는 worktree 추가 (상태 변경 방지)

---

## 4. 검증 방법 (Validation Methods)

```bash
# 에이전트 권한 설정 확인
grep -r "edit: deny" .opencode/agents/
grep -r "npm publish\*.*deny" .opencode/agents/
grep -r "pnpm publish\*.*deny" .opencode/agents/

# 커맨드-에이전트 참조 일치 확인
grep -r "ilokesto-" .opencode/commands/

# command를 shadowing하는 skill이 없는지 확인
for cmd in search-issue create-lane execute-lane issue-to-pr pr-to-merge compare-impact add-changeset docs-sync-check release-readiness; do
  test ! -f ".opencode/skills/$cmd/SKILL.md"
done

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