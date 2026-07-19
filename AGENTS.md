# ilokesto Handbook

This repository is the single source of truth for the ilokesto library ecosystem. Each package (`store`, `state`, `form`, `modal`, `overlay`, `toast`, `fetcher`, `utilinent`) lives in its own independent Git repository. This handbook tracks cross-cutting concerns only.

## When you work on ilokesto

1. Read `PACKAGES.md` to understand the scope and comparable libraries for the package you are touching.
2. Read `ARCHITECTURE.md` to see how packages depend on each other and why.
3. Read `COMMANDS.md` for OpenCode commands and subagent skills defined for this ecosystem.
4. Load relevant skills from `.opencode/skills/` when working on a specific package or cross-cutting concern.
5. For package-specific details, look at that package's own repository.

## Repository layout

```
ilokesto/
├── .gitignore              # Ignores independent package directories
├── AGENTS.md               # This file
├── PACKAGES.md             # Per-package scope and comparisons
├── ARCHITECTURE.md         # Dependency graph and decisions
├── COMMANDS.md             # OpenCode commands/skills overview
├── DECISIONS/              # Architecture Decision Records (ADRs)
└── SKILLS/                 # OpenCode skill definitions
```

## Core principles

- **Independent repositories**: Each package versions, releases, and maintains its own changelog.
- **Changesets everywhere**: All published packages use `@changesets/cli` for release automation.
- **Docs live with source**: Each package keeps its documentation in `docs/`. Pushes to `docs/` on `main` open a sync PR in `ilokesto/docs`.
- **Shared patterns over shared code**: Prefer conventions documented here before adding cross-package abstractions.
