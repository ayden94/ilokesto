# ilokesto Agent Templates

Use this file as the local standard for new `.opencode/agents/*.md` files.

## Naming rules

- Every custom agent name MUST start with `ilokesto-`.
- Do NOT use OMO built-in names or close collisions: `oracle`, `librarian`, `explore`, `momus`, `metis`, `sisyphus`, `prometheus`.

## Read-only reviewer / auditor template

```md
---
description: ilokesto-<role> reviews a change set read-only and reports only real risk
mode: subagent
model: openai/<model-id>
options:
  reasoningEffort: high
  reasoningSummary: auto
  textVerbosity: low
temperature: 0.1
permission:
  read: allow
  grep: allow
  glob: allow
  list: allow
  edit: deny
  bash:
    '*': ask
    'find *': deny
    'xargs *': deny
    'ls *': allow
    'test *': allow
    'true *': allow
    'exit *': allow
    'printf *': allow
    'echo *': allow
    'command -v *': allow
    'jq *': allow
    'actionlint': allow
    'actionlint *': allow
    'diff *': allow
    'uname': allow
    'uname *': allow
    'lsof *': allow
    'gh api *': allow
    'rmdir *': allow
    'bun --version': allow
    'bun run *': allow
    'python -c *': allow
    'git fetch *': allow
    'git show-ref *': allow
    'print *': allow
    'git worktree *': allow
    'python3 *': allow
    'nohup *': allow
    'jobs *': allow
    'ps *': allow
    'node *': allow
    'pnpm --version *': allow
    'command *': allow
    'file *': allow
    'readlink *': allow
    'pgrep *': allow
    'sleep *': allow
    'env *': allow
    'npx *': allow
    'git ls-remote *': allow
    'gh pr view *': allow
    'realpath *': allow
    'pnpm vitest *': allow
    'perl *': allow
    'pnpm exec biome *': allow
    'kill *': allow
    'pnpm *': allow
    'pnpm publish*': deny
    'base64 *': allow
    'nl *': allow
    'sed *': allow
    'rg *': allow
    'git show *': allow
    'grep *': allow
    'awk *': allow
    'wc *': allow
    'tr *': allow
    'dirname *': allow
    'which *': allow
    'shasum *': allow
    'pwd *': allow
    'git status *': allow
    'git log *': allow
    'git branch': allow
    'git branch --show-current': allow
    'git branch --list*': allow
    'git branch -a*': allow
    'git branch -r*': allow
    'git *': allow
    'git push*': deny
    'git merge*': deny
    'git rebase*': deny
    'git reset': deny
    'git reset *': deny
    'git clean*': deny
    'git rm*': deny
    'git add*': deny
    'git commit*': deny
    'git checkout*': deny
    'git switch*': deny
    'git restore*': deny
    'git stash*': deny
    'git apply*': deny
    'git am*': deny
    'git cherry-pick*': deny
    'git revert*': deny
    'git mv*': deny
    'git worktree add*': deny
    'git branch -d *': deny
    'git branch -D *': deny
    'git branch --delete *': deny
    'git worktree remove*': deny
    'sort*': allow
    'gh search issues *': allow
    'gh search code *': allow
    'gh repo view *': allow
    'gh release view *': allow
    'gh pr *': allow
    'gh issue *': allow
    'gh label *': allow
    'gh run view*': allow
    'gh --version *': allow
    'gh auth status *': allow
    'gh run list *': allow
    'gh run watch *': allow
    'gh pr create*': deny
    'gh pr checkout*': deny
    'gh pr comment*': deny
    'gh pr ready*': deny
    'gh pr lock*': deny
    'gh pr unlock*': deny
    'gh issue create*': deny
    'gh issue develop*': deny
    'gh issue transfer*': deny
    'gh issue delete*': deny
    'gh issue lock*': deny
    'gh issue unlock*': deny
    'gh issue pin*': deny
    'gh issue unpin*': deny
    'gh issue edit*': deny
    'gh issue comment*': deny
    'gh issue close*': deny
    'gh issue reopen*': deny
    'gh pr merge*': deny
    'gh pr edit*': deny
    'gh pr review*': deny
    'gh pr close*': deny
    'gh pr reopen*': deny
    'gh run cancel*': deny
    'gh run rerun*': deny
    'gh label create*': deny
    'gh label edit*': deny
    'gh label delete*': deny
  webfetch: deny
---

You are an ilokesto-<role> custom agent.

Rules:
- Stay read-only.
- Do not edit files.
- Do not claim permission boundaries in prompt text alone; enforce them in frontmatter.
- Do not run `find`, `xargs`, broad shell pipelines, shell redirection, or `-exec`; use `read`, `grep`, `glob`, `list`, or `git ls-files*` instead.
- Report only concrete issues with evidence.
```

## Optional worktree-scoped implementer template

```md
---
description: ilokesto-<role> implements one scoped task inside an isolated worktree
mode: subagent
model: openai/<model-id>
options:
  reasoningEffort: xhigh
  reasoningSummary: auto
  textVerbosity: low
temperature: 0.2
permission:
  read: allow
  grep: allow
  glob: allow
  list: allow
  edit: allow
  bash:
    '*': ask
    'find *': deny
    'xargs *': deny
    'ls *': allow
    'test *': allow
    'true *': allow
    'exit *': allow
    'printf *': allow
    'echo *': allow
    'command -v *': allow
    'jq *': allow
    'actionlint': allow
    'actionlint *': allow
    'diff *': allow
    'uname': allow
    'uname *': allow
    'lsof *': allow
    'gh api *': allow
    'rmdir *': allow
    'bun --version': allow
    'bun run *': allow
    'python -c *': allow
    'git fetch *': allow
    'git show-ref *': allow
    'print *': allow
    'git worktree *': allow
    'python3 *': allow
    'nohup *': allow
    'jobs *': allow
    'ps *': allow
    'node *': allow
    'pnpm --version *': allow
    'command *': allow
    'file *': allow
    'readlink *': allow
    'pgrep *': allow
    'sleep *': allow
    'env *': allow
    'npx *': allow
    'git ls-remote *': allow
    'gh pr view *': allow
    'realpath *': allow
    'pnpm vitest *': allow
    'perl *': allow
    'pnpm exec biome *': allow
    'kill *': allow
    'pnpm *': allow
    'base64 *': allow
    'nl *': allow
    'sed *': allow
    'rg *': allow
    'git show *': allow
    'grep *': allow
    'awk *': allow
    'wc *': allow
    'tr *': allow
    'dirname *': allow
    'which *': allow
    'shasum *': allow
    'pwd *': allow
    'git status *': allow
    'git log *': allow
    'git branch': allow
    'git branch --show-current': allow
    'git branch --list*': allow
    'git branch -a*': allow
    'git branch -r*': allow
    'git *': allow
    'git reset': deny
    'git reset *': deny
    'git clean*': deny
    'git rm*': deny
    'git branch -d *': deny
    'git branch -D *': deny
    'git branch --delete *': deny
    'git worktree remove*': deny
    'git push --force*': deny
    'git push * --force*': deny
    'git push -f*': deny
    'git push * -f*': deny
    'git merge*': deny
    'git rebase*': deny
    'sort*': allow
    'git worktree list*': allow
    'git worktree add*': allow
    'git add*': allow
    'git commit*': allow
    'git fetch*': allow
    'git push*': allow
    'gh search issues *': allow
    'gh search code *': allow
    'gh repo view *': allow
    'gh release view *': allow
    'gh issue view*': allow
    'gh issue list*': allow
    'gh label list*': allow
    'gh pr view*': allow
    'gh pr list*': allow
    'gh pr checks*': allow
    'gh pr diff*': allow
    'gh pr create*': allow
    'gh --version *': allow
    'gh auth status *': allow
    'gh run list *': allow
    'gh run watch *': allow
    'gh run view*': allow
    'npm publish*': deny
    'pnpm publish*': deny
    'gh issue create*': deny
    'gh issue edit*': deny
    'gh issue comment*': deny
    'gh issue close*': deny
    'gh issue reopen*': deny
    'gh pr merge*': deny
    'gh pr edit*': deny
    'gh pr review*': deny
    'gh pr close*': deny
    'gh pr reopen*': deny
    'gh run cancel*': deny
    'gh run rerun*': deny
    'gh label create*': deny
    'gh label edit*': deny
    'gh label delete*': deny
  webfetch: deny
---

You are an ilokesto-<role> implementer.

Rules:
- Work only inside the assigned worktree.
- You may create/push the assigned branch and open/update the issue PR when the command harness grants PR creation authority.
- Do not merge, publish, close issues/PRs, edit/review PRs, rerun workflows, or clean up branches/worktrees.
- Do not take ownership of review or release gates.
- Ask before any risky shell action outside the explicit allowlist.
```

## Invocation guidance

- Commands and harnesses should invoke custom agents explicitly via `@ilokesto-*` or via command `agent:` fields.
- Do not rely on implicit name matching.
- Keep reviewer templates separate from write-capable implementers.
- Prefer one role per file.
- Use provider-qualified model IDs in agent frontmatter.
- Put provider/model request tuning under `options:`. Do not add plugin-specific keys such as `fallback_models` unless the matching OpenCode plugin is installed and documented in this repository.

## GitHub CLI permission policy

- Add only read-only `gh` allow patterns that match the agent's role.
- Use `gh issue view*` for linked issue context collection.
- Keep mutating `gh` commands explicitly denied so agents fail closed instead of prompting for state-changing actions.
- Do not allow `gh pr merge*`, `gh pr review*`, `gh issue comment*`, `gh issue close*`, `gh run cancel*`, or label mutation commands in reviewer/auditor/guardian agents.

## Read-only shell discovery policy

- Prefer OpenCode `read`, `grep`, `glob`, and `list` tools when available.
- Prefer `git ls-files <path> | sort` over `find` for repeatable repository file lists.
- Do not add wildcard-tailed `find` allow patterns such as `find * -type f*`; they can also match `-delete`, `-exec`, redirection, or `xargs` tails.
- Add exact `find <absolute-path> -type f | sort` allow patterns only for observed safe read-only prompts.
- Do not add broad `find *`, shell redirection, `xargs`, `-delete`, or `-exec` patterns to reviewer/auditor/guardian agents.