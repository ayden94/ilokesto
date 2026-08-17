# ilokesto Handbook

This repository is the single source of truth for the ilokesto library ecosystem. Publishable packages live under `packages/` in one pnpm workspace and are released independently through root Changesets automation.

## When you work on ilokesto

1. Read `PACKAGES.md` to understand the scope and comparable libraries for the package you are touching.
2. Read `ARCHITECTURE.md` to see how packages depend on each other and why.
3. Read `COMMANDS.md` for OpenCode commands and subagent skills defined for this ecosystem.
4. Read `packages/<name>/AGENTS.md` and load the matching skill before changing a package.
5. Run package commands with `pnpm --filter @ilokesto/<name> <script>` or from that package directory.
6. Add a root changeset for consumer-facing changes.

## Repository layout

```
ilokesto/
├── .changeset/             # Release declarations and configuration
├── .github/workflows/      # CI, release, and docs sync
├── .opencode/              # Project-local OpenCode agents, commands, and skills
│   ├── agents/             # Custom subagent definitions (ilokesto-*)
│   ├── commands/           # Slash command harnesses (*.md)
│   ├── skills/             # Knowledge skills (ilokesto-*/SKILL.md)
│   ├── opencode.json       # Project config
│   └── VALIDATION.md       # Agent/command/skill validation guide
├── .omo/                   # Lane and search-run ledgers
│   ├── lanes/
│   └── search-runs/
├── .worktrees/             # Isolated implementation worktrees
├── packages/               # Publishable @ilokesto packages
├── DECISIONS/              # Architecture Decision Records
├── AGENTS.md
├── ARCHITECTURE.md
├── COMMANDS.md
├── PACKAGES.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Core principles

- **Independent versions**: Packages share Git history but retain separate versions and changelogs.
- **One release control plane**: Changesets, lockfile, CI, and publishing are rooted here.
- **Docs live with source**: Package docs remain beside source and root workflows sync them to `ilokesto/docs`.
- **Shared patterns over shared code**: Prefer conventions documented here before adding cross-package abstractions.

## OpenCode agent, command, and skill structure

- **Agents** (`.opencode/agents/ilokesto-*.md`): role-specific subagents with frontmatter permissions. Implementers are worktree-scoped; reviewers are read-only.
- **Commands** (`.opencode/commands/*.md`): slash-command harnesses that orchestrate workflows and delegate to agents.
- **Skills** (`.opencode/skills/ilokesto-*/SKILL.md`): knowledge packs loaded by agents and commands. Package-specific skills hold domain knowledge; governance skills hold cross-cutting rules.
- **Ledgers** (`.omo/`): `search-runs/` for `/search-issue` output; `lanes/` for `/create-lane` and `/execute-lane` state.

## Authority and side-effect gates

High-impact side effects require explicit user approval or command harness authority:

- GitHub issue creation
- Pull Request merging
- Worktree/branch cleanup
- Package publishing (always via GitHub Actions Changesets workflow, never local)

## Naming conventions

- Custom agent names MUST start with `ilokesto-` and must not collide with OMO built-in names (`oracle`, `librarian`, `explore`, `momus`, `metis`, `sisyphus`, `prometheus`).
- Command names must not shadow skill names to avoid resolver conflicts.
- Package skills are named `ilokesto-<package>`.
- Governance skills are named `ilokesto-<domain>` (e.g., `ilokesto-release-governance`).