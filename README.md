# ilokesto Monorepo

This repository is the source of truth for the **ilokesto** library ecosystem. It contains eight independently versioned npm packages managed with pnpm workspaces and Changesets.

## What this repository contains

- **Package source**: publishable libraries under `packages/*`.
- **Official documentation site**: the private Next.js application under `apps/docs`, using package-owned documentation.
- **Cross-cutting documentation**: scope, architecture, and decisions shared across packages.
- **Central automation**: one lockfile, one gated CI/release workflow, and root Changesets configuration.

## Repository layout

```
ilokesto/
├── .changeset/             # Release declarations and configuration
├── .github/workflows/      # CI, release, and package docs sync
├── apps/docs/             # Official bilingual documentation site
├── packages/               # Publishable @ilokesto packages
├── DECISIONS/              # Architecture Decision Records
├── package.json            # Root scripts
├── pnpm-lock.yaml          # Single dependency lockfile
└── pnpm-workspace.yaml     # Applications, packages, and form examples
```

## Workspace packages

The workspace contains `store`, `state`, `form`, `overlay`, `modal`, `toast`, `fetcher`, and `utilinent` under `packages/`, the private documentation app under `apps/docs`, and form examples. Legacy local top-level `docs/` and `playground/` clones are not workspace projects.

## Core principles

- **Independent package versions**: Packages share a repository but version and publish independently.
- **Root Changesets**: Consumer-facing changes add one file under `.changeset/`; publishing uses package-specific npm dist-tags.
- **Docs live with source**: Each package keeps documentation in `packages/<name>/docs/`; `apps/docs` consumes these originals. Existing cross-repository sync workflows remain only until the production deployment is switched.
- **Shared patterns over shared code**: Prefer conventions documented here before adding cross-package abstractions.

## Getting started

```bash
pnpm install
pnpm build
pnpm test
pnpm changeset
```

## Official documentation

Use Node.js 22 and the pinned pnpm version from `packageManager`.

```bash
pnpm install --frozen-lockfile
pnpm docs:dev
```

The site preserves `/en/<package>` and `/ko/<package>` routes. Edit package
content in `packages/<name>/docs/` and site code in `apps/docs/`.
Run `pnpm docs:build`, `pnpm docs:typecheck`, and `pnpm docs:test` for
documentation-only validation. Root build, typecheck, and test commands include
the site as well. The private app is not published to npm.

See [the site guide](apps/docs/README.md) and
[the deployment transition](DECISIONS/004-docs-in-monorepo.md).
