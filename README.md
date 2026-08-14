# ilokesto Monorepo

This repository is the source of truth for the **ilokesto** library ecosystem. It contains eight independently versioned npm packages managed with pnpm workspaces and Changesets.

## What this repository contains

- **Package source**: publishable libraries under `packages/*`.
- **Cross-cutting documentation**: scope, architecture, and decisions shared across packages.
- **Central automation**: one lockfile, CI workflow, Changesets configuration, and release workflow.

## Repository layout

```
ilokesto/
├── .changeset/             # Release declarations and configuration
├── .github/workflows/      # CI, release, and package docs sync
├── packages/               # Publishable @ilokesto packages
├── DECISIONS/              # Architecture Decision Records
├── package.json            # Root scripts
├── pnpm-lock.yaml          # Single dependency lockfile
└── pnpm-workspace.yaml     # packages/* workspace boundary
```

## Workspace packages

The workspace contains `store`, `state`, `form`, `overlay`, `modal`, `toast`, `fetcher`, and `utilinent` under `packages/`. The local top-level `docs/` and `playground/` directories remain separate repositories and are not workspace projects.

## Core principles

- **Independent package versions**: Packages share a repository but version and publish independently.
- **Root Changesets**: Consumer-facing changes add one file under `.changeset/`.
- **Docs live with source**: Each package keeps documentation in `packages/<name>/docs/`; root workflows sync it to `ilokesto/docs`.
- **Shared patterns over shared code**: Prefer conventions documented here before adding cross-package abstractions.

## Getting started

```bash
pnpm install
pnpm build
pnpm test
pnpm changeset
```
