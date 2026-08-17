# ilokesto OpenCode Commands & Skills

This document lists OpenCode commands, agents, and skills defined for the ilokesto ecosystem.

## Global rules

- Always read `AGENTS.md` first when entering the ilokesto handbook repository.
- Load relevant skills from `.opencode/skills/` when working on a specific package or cross-cutting concern.
- Treat `packages/*` as one Git repository and one pnpm workspace; cross-package changes should be atomic and dependency-aware.
- Prefer conventions documented here over adding shared code between packages.

## Agents

Custom agents live in `.opencode/agents/` and are invoked explicitly by commands via `@ilokesto-*` or command `agent:` fields.

| Agent | Role | Permissions |
|---|---|---|
| `ilokesto-scoped-implementer` | Non-UI package implementation (store, state, form core, fetcher) | `edit: allow` (worktree-scoped) |
| `ilokesto-ui-implementer` | UI package implementation (overlay, modal, toast, utilinent, form adapters) | `edit: allow` (worktree-scoped) |
| `ilokesto-contract-reviewer` | Public API and cross-package contract review | `edit: deny` (read-only) |
| `ilokesto-code-reviewer` | Bug, type safety, implementation quality review | `edit: deny` (read-only) |
| `ilokesto-verification-reviewer` | Test coverage and verification result review | `edit: deny` (read-only) |
| `ilokesto-docs-release-reviewer` | Docs sync, Changesets, release readiness review | `edit: deny` (read-only) |
| `ilokesto-issue-registration-reviewer` | Issue draft registration triage | `edit: deny` (read-only) |

## Commands

Commands live in `.opencode/commands/` and are triggered by slash invocations.

### `/search-issue`

Package-level audit or R&D discovery. Routes to purpose-based reviewers, drafts issues, triages via `ilokesto-issue-registration-reviewer`, and creates GitHub issues only after user approval.

```
/search-issue <package-name|all> <purpose> [--register]
```

### `/create-lane`

Consumes confirmed issues from `/search-issue` and creates a lane ledger at `.omo/lanes/<lane-id>.json` with dependency-aware parallel grouping.

```
/create-lane <issue-url|issue-number|search-run-id> [base-branch]
```

### `/execute-lane`

Consumes a lane ledger and dispatches `/issue-to-pr` per lane item. Completed PRs go through `/pr-to-merge` immediately (per-lane progress, no global batch barrier). Supports fix-back and gated merge/cleanup.

```
/execute-lane <lane-id|lane-ledger-path> [resume] [--full-auto] [base-branch]
```

### `/issue-to-pr`

Creates a worktree, delegates implementation to `@ilokesto-scoped-implementer` or `@ilokesto-ui-implementer`, verifies, commits, and opens a PR. Supports fix-back mode for existing PRs.

```
/issue-to-pr <github-issue-url|issue-number> [base-branch] [--fix-back <pr-url|pr-number> <branch-name> <worktree-path>]
```

### `/pr-to-merge`

Reviews a PR with three independent reviewers (contract, code, verification) plus docs-release when consumer-facing. Returns `approve | block | needs-human-check` with blocker evidence.

```
/pr-to-merge <pr-url|pr-number>
```

### `/compare-impact`

Read-only analysis of a package's scope and comparable libraries, or the cross-package impact of a change.

```
/compare-impact <package-name> [scope|impact]
```

### `/add-changeset`

Adds a root `.changeset/*.md` file for a package. Validates semver bump against change type.

```
/add-changeset [package-name] [patch|minor|major] <summary>
```

### `/docs-sync-check`

Read-only validation of a package's docs Fumadocs structure, bilingual README sync, and `.npmignore` exclusion.

```
/docs-sync-check [package-name]
```

### `/release-readiness`

Read-only validation of release readiness for a package or the whole monorepo. Checks changesets, semver, build, test, dist (fetcher), and major migration notes.

```
/release-readiness [package-name|all]
```

## Skills

Skills live in `.opencode/skills/<name>/SKILL.md` and are loaded by agents and commands.

### Package skills

| Skill | Package | Domain |
|---|---|---|
| `ilokesto-store` | `store` | state |
| `ilokesto-state` | `state` | state |
| `ilokesto-form` | `form` | forms |
| `ilokesto-overlay` | `overlay` | ui |
| `ilokesto-modal` | `modal` | ui |
| `ilokesto-toast` | `toast` | ui |
| `ilokesto-fetcher` | `fetcher` | http |
| `ilokesto-utilinent` | `utilinent` | ui |

### Cross-cutting skills

| Skill | Purpose |
|---|---|
| `ilokesto-compare` | Scope comparison and impact analysis |
| `ilokesto-docs-sync` | Docs sync workflow knowledge |
| `ilokesto-release` | Changesets and release flow knowledge |
| `ilokesto-onboarding` | New package scaffolding |

### Governance skills

| Skill | Purpose |
|---|---|
| `ilokesto-ecosystem-map` | Package groups, dependency direction, routing rules |
| `ilokesto-issue-audit` | Purpose routing, label allowlist, finding schema for `/search-issue` |
| `ilokesto-release-governance` | Changesets rules, semver policy, release gate |
| `ilokesto-docs-governance` | Fumadocs layout, bilingual README, sync workflow |
| `ilokesto-worktree-governance` | Worktree path rules, branch naming, fix-back mode, cleanup gate |

## Conventions

- Use `packages/<name>/AGENTS.md` for package-local rules; ecosystem-wide rules live in `AGENTS.md`.
- Skills should be loaded via `load_skills` in task delegation when a package is involved.
- Run package scripts with `pnpm --filter @ilokesto/<name> <script>`.
- Command names must not shadow skill names.
- All consumer-facing changes require a root changeset under `.changeset/`.