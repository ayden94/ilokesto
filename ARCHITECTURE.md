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

### 1. Independent repositories, not a monorepo

Each package versions and releases independently. This keeps release history clean and allows different maintainership cadences. Changesets coordinate the per-repo release process.

### 2. `store` is the only shared foundation

`store` is intentionally small and framework-agnostic. Higher-level packages build on it rather than duplicating state primitives.

### 3. `overlay` is the shared React layer

Both `modal` and `toast` are built on `overlay`. This keeps lifecycle, provider scoping, and adapter behavior consistent across layered UI components.

### 4. Framework adapters live in consumer packages

`state`, `form`, and future packages provide React/Vue/Solid/Svelte/Angular adapters in their own repos. The core stays framework-agnostic.

### 5. Docs live with source

Each package repo owns its `docs/` folder. The central `ilokesto/docs` site consumes those folders via the `sync-docs` workflow. This keeps documentation close to the code it describes.

## Cross-cutting automation

- **Release**: `@changesets/cli` + GitHub Actions in each package repo.
- **Docs sync**: `.github/workflows/sync-docs.yml` in each package repo opens PRs in `ilokesto/docs` when `docs/` changes on `main`.
- **CI**: Each package repo runs typecheck, test, and build on PR/push.
