# ilokesto Metarepo

This repository is the central handbook for the **ilokesto** library ecosystem. It does not contain library source code; each package lives in its own independent GitHub repository under the `ilokesto` organization.

## What this repository contains

- **Cross-cutting documentation**: scope, architecture, and decisions shared across all ilokesto packages.
- **OpenCode commands and skills**: conventions and subagent instructions for working on ilokesto libraries.
- **Automation references**: how Changesets, CI, and docs synchronization work across the ecosystem.

## Repository layout

```
ilokesto/
├── .gitignore              # Excludes independent package directories
├── README.md               # This file
├── AGENTS.md               # OpenCode entrypoint
├── PACKAGES.md             # Per-package scope and comparable libraries
├── ARCHITECTURE.md         # Dependency graph and architectural decisions
├── COMMANDS.md             # OpenCode commands and skills overview
├── DECISIONS/              # Architecture Decision Records (ADRs)
└── .opencode/              # OpenCode commands, agents, and skills
    ├── commands.json
    ├── agents.md
    └── skills/
```

## How packages relate to this repo

The following directories are present locally but are ignored by Git because each one is an independent repository:

- `store`
- `state`
- `form`
- `modal`
- `overlay`
- `toast`
- `fetcher`
- `utilinent`
- `docs`
- `playground`

When working on a specific package, open that directory as its own Git repository. Load the matching `.opencode/skills/ilokesto-<package>` skill for context.

## Core principles

- **Independent repositories**: Each package versions, releases, and maintains its own changelog.
- **Changesets everywhere**: All published packages use `@changesets/cli` for release automation.
- **Docs live with source**: Each package keeps its documentation in `docs/`. Changes are synced to `ilokesto/docs` via GitHub Actions.
- **Shared patterns over shared code**: Prefer conventions documented here before adding cross-package abstractions.

## Getting started

1. Read `AGENTS.md` for how OpenCode should navigate this ecosystem.
2. Read `PACKAGES.md` to understand what each library does and what it compares to.
3. Read `ARCHITECTURE.md` to see how packages depend on each other.
4. Use the `.opencode/skills/` definitions when delegating work to subagents.
