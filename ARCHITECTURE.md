# ilokesto Architecture

This document describes how ilokesto packages relate to each other and the decisions behind that structure.

## Dependency graph

```
                    @ilokesto/store
                          |
        +-----------------+-----------------+
        |                 |                 |
@ilokesto/state    @ilokesto/overlay    @ilokesto/form
                          |
              +-----------+
              |
      @ilokesto/modal     @ilokesto/toast
```

### Leaves (no internal dependencies)

- `@ilokesto/store`
- `@ilokesto/fetcher`
- `@ilokesto/utilinent`

### First-order consumers

- `@ilokesto/state` → `store`
- `@ilokesto/overlay` → `store`
- `@ilokesto/form` → `store`

### Second-order consumers

- `@ilokesto/modal` → `overlay` → `store`
- `@ilokesto/toast` → `overlay` + `store`

## Key architectural decisions

### 1. One repository, independent package versions

All package source lives under `packages/` in one pnpm workspace. Changesets versions and publishes packages independently, so cross-package changes can be reviewed and tested atomically without forcing lockstep releases.

### 2. `store` is the only shared foundation

`store` is intentionally small and framework-agnostic. Higher-level packages build on it rather than duplicating state primitives.

### 3. `overlay` is the shared React layer

Both `modal` and `toast` are built on `overlay`. This keeps lifecycle, provider scoping, and adapter behavior consistent across layered UI components.

### 4. Framework adapters live in consumer packages

`state`, `form`, and future packages provide React/Vue/Solid/Svelte/Angular adapters in their own package directories. The core stays framework-agnostic.

### 5. Docs live with source

Each package owns its `docs/` folder. The central `ilokesto/docs` site consumes those folders via root package-scoped workflows. This keeps documentation close to the code it describes.

## Cross-cutting automation

- **Release**: Root `@changesets/cli` configuration and `.github/workflows/release.yml` create release PRs and publish packages.
- **Docs sync**: Root package-scoped workflows open PRs in `ilokesto/docs` when `packages/<name>/docs/` changes on `main`.
- **CI**: Root CI installs one lockfile, builds in dependency order, and preserves package-specific quality gates.
