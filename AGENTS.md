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
├── packages/               # Publishable packages
├── DECISIONS/              # Architecture Decision Records
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Core principles

- **Independent versions**: Packages share Git history but retain separate versions and changelogs.
- **One release control plane**: Changesets, lockfile, CI, and publishing are rooted here.
- **Docs live with source**: Package docs remain beside source and root workflows sync them to `ilokesto/docs`.
- **Shared patterns over shared code**: Prefer conventions documented here before adding cross-package abstractions.
