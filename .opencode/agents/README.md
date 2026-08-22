# ilokesto Agent Templates

Use these templates for new `.opencode/agents/ilokesto-*.md` roles. Workflow state, receipt semantics, authority, and transitions live only in [`ilokesto-workflow-governance`](../skills/ilokesto-workflow-governance/SKILL.md); agent profiles define capabilities, not a second workflow contract.

## Naming and configuration

- Prefix every custom role with `ilokesto-`.
- Do not collide with built-in agent names.
- Use a provider-qualified model such as `openai/gpt-5.6-terra`.
- Start `permission` and `permission.bash` with `'*': deny`. OpenCode resolves the last matching rule, so narrow allows follow the broad deny and equivalent-command denials follow all allows.
- Deny `external_directory` for roles confined to the active repository or assigned worktree.
- Keep mutation authority in executable frontmatter. Prompt prose is not a permission boundary.

## Read-only reviewer template

```md
---
description: ilokesto-<role> reviews one assigned change set read-only
mode: subagent
model: openai/<model-id>
permission:
  '*': deny
  read: allow
  grep: allow
  glob: allow
  list: allow
  skill: allow
  edit: deny
  external_directory: deny
  bash:
    '*': deny
    'env *': deny
    'command *': deny
    'sh *': deny
    'bash *': deny
    'zsh *': deny
    'node *': deny
    'git status*': allow
    'git diff*': allow
    'git log*': allow
    'git show*': allow
    'git rev-parse*': allow
    'git merge-base*': allow
    'git show-ref*': allow
    'git ls-files*': allow
    'git branch --show-current': allow
    'git branch --list*': allow
    'git worktree list*': allow
    'gh issue view*': allow
    'gh issue list*': allow
    'gh pr view*': allow
    'gh pr list*': allow
    'gh pr checks*': allow
    'gh pr diff*': allow
    'gh run view*': allow
    'gh run list*': allow
    'git diff *--no-index*': deny
    'git diff *--output*': deny
    'git diff *--ext-diff*': deny
    'git diff *--textconv*': deny
    'git diff* /*': deny
    'git diff*../*': deny
    '*>*': deny
    '*<*': deny
    '*|*': deny
    '*&&*': deny
    '*&*': deny
    '*;*': deny
    '*$(*': deny
    '*`*': deny
  webfetch: deny
  websearch: deny
---

Stay read-only and report evidence from exact current-head CI checks plus canonical worker verification receipts and evidence. Do not execute repository-controlled code or scripts locally. Missing or stale required evidence must produce `BLOCK`, never local execution.
```

Reviewer rules:

- Reviewers have no local package verifier, `actionlint`, or Changesets execution grants. Verification execution belongs to the trusted implementer verifier and CI boundary.
- Never allow broad `git *`, `gh api *`, `gh pr *`, `gh issue *`, `gh label *`, `pnpm *`, `node *`, `env *`, or shell wrappers.
- GitHub reads use named read-only subcommands. PR review submission is a mutation and remains denied.
- Dedicated `read`, `grep`, `glob`, and `list` tools replace arbitrary discovery commands.
- Keep hostile `git diff` denials after read allows so `--no-index`, output/ext-diff/textconv options, absolute paths, and traversal remain denied by last-match resolution.

## Assigned-worktree implementer template

```md
---
description: ilokesto-<role> implements one task in an already-created assigned worktree
mode: subagent
model: openai/<model-id>
permission:
  '*': deny
  read: allow
  grep: allow
  glob: allow
  list: allow
  skill: allow
  edit: deny
  external_directory: deny
  bash:
    '*': deny
    'env *': deny
    'command *': deny
    'sh *': deny
    'bash *': deny
    'zsh *': deny
    'node *': deny
    'git status*': allow
    'git diff*': allow
    'git log*': allow
    'git show*': allow
    'git rev-parse*': allow
    'git ls-files*': allow
    'git branch --show-current': allow
    'git worktree list*': allow
    'gh issue view*': allow
    'gh pr view*': allow
    'gh pr checks*': allow
    'gh pr diff*': allow
    'git *--output*': deny
    'git commit *--amend*': deny
    'git commit *--no-verify*': deny
    'git commit -m * -a*': deny
    'git commit -m *--all*': deny
    'git add --all*': deny
    'git add -A*': deny
    'git add .worktrees/*': deny
    'git add *../*': deny
    'git add /*': deny
    'git add ~*': deny
    'git add *$*': deny
    '*>*': deny
    '*<*': deny
    '*|*': deny
    '*&&*': deny
    '*&*': deny
    '*;*': deny
    '*$(*': deny
    '*`*': deny
  webfetch: deny
  websearch: deny
---

Require `WORKTREE_PATH`, work only in that already-created worktree, and return commit and verification evidence to the supervisor.
```

Implementer rules:

- Root-loaded implementer profiles are edit-denied and have no direct stage, commit, pnpm, node, or package-script grant. The supervisor invokes only `node scripts/workflow/implementer-launcher.mjs <exact-role> .worktrees/issue-* .omo/inbox/*.json [continuation]`.
- The root-owned launcher validates the exact registered realpath worktree, symlink absence, canonical handoff, role, branch, control characters, and optional continuation. It resolves tool executables only from fixed supervisor locations, invokes canonical OpenCode with fixed argv and `shell: false`, and passes an explicit child environment rather than the supervisor environment; callers cannot pass config, agent, or OpenCode flags.
- The child config grants edit only inside the `--dir` project and grants only absolute trusted-root `implementer-vcs.mjs` and `implementer-verify.mjs` commands. Shell composition remains denied after those allows.
- The VCS wrapper requires a clean launch index, stages only into a root-owned single-link private index, and records its device/inode plus exact paths/status/tree. Commit holds the primary index lock, runs present standard commit hooks with `--ignore-missing` and post-hook approval revalidation, creates the commit from that private tree, atomically compares-and-swaps the assigned branch with `git update-ref <ref> <new> <launch-head>`, and installs the approved index only for the CAS winner.
- On Darwin, the verifier wrapper executes every mapped descendant through `/usr/bin/sandbox-exec` with fixed argv, a strict non-inherited environment, and an internally generated deny-default policy. Global file-content reads are forbidden; data reads are limited to the assigned worktree, exact trusted configs/tool shims, canonical dependency/tool/cache roots, and narrow system runtime files. Writes remain limited to the exact assigned worktree and `/dev/null`; HOME, TMP, and caches are inside the worktree.
- Verifier mappings use trusted-root Vitest/tsup configs where compatible. Custom verifier modules and their declared local dependencies must match trusted bytes, and Node load hooks execute those trusted bytes at the assigned module URLs to remove the integrity-check/execution race. Unsupported platforms or an unavailable sandbox executable fail closed; no portable non-Darwin sandbox is claimed.
- Worktree creation, every push/refspec, PR create/update, ledger writes, merge, cleanup, branch deletion, workflow mutation, and publishing belong to the supervisor or authority-gated wrapper, never an implementer. The release boundary is a non-authorizing GitHub Actions handoff; OpenCode never publishes packages.
- Implementer handovers are machine-readable receipts. Durable receipts and evidence omit secrets, session IDs, absolute local paths, and raw transcripts.
- Implementers do not review their own output or decide merge readiness.

## Validation

- Run `node --test tests/monorepo/workflow-role-permissions.test.mjs` after any role change.
- Run `opencode agent list` after changing frontmatter, then restart OpenCode because role configuration is loaded only at startup.
- Run the monorepo suite before handoff. Permission probes must resolve rules statically and must not perform GitHub, Git, package, or filesystem mutations.
