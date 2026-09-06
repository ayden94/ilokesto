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

The next major foundation exports `ReadableStore`/`StoreApi` structural contracts
and `createStore`. Commits stay immediate; notifications drain synchronously in FIFO
order using captured commit values. Subscription ownership and delivery failures
are defined in `DECISIONS/005-state-foundation.md`.

### 3. `overlay` is the shared React layer

Both `modal` and `toast` are built on `overlay`. This keeps lifecycle, provider scoping, and adapter behavior consistent across layered UI components.

Each `ModalProvider` also owns an internal modal stack runtime. Inline and top-layer adapters share that provider-local runtime for topness, stack indexes, Escape, backdrop, and focus policy while `overlay` continues to own presence lifecycle and the item store. Multiple modal providers are isolated when they receive distinct overlay stores.

The `modal` / `globalModalStore` facade is the backward-compatible exception: providers without an explicit `store` all use the same global store, so applications must mount only one default `ModalProvider`. Applications that need multiple providers must pass a distinct store to each provider.

### 4. Framework adapters live in consumer packages

`state`, `form`, and future packages provide React/Vue/Solid/Svelte/Angular adapters in their own package directories. The core stays framework-agnostic.

State's root now owns vanilla construction and composition. Framework `bind(store)`
and `bindReducer(handle)` connect existing state without recreating it or
re-registering reducers. Existing `create` helpers use this same foundation.

### 5. Docs live with source

Each package owns its `docs/` folder. The private `apps/docs` Next.js/Fumadocs workspace consumes these originals, keeping code, content, and site changes in one review. English and Korean public URL paths remain unchanged. See `DECISIONS/004-docs-in-monorepo.md` for the production transition.

## Cross-cutting automation

- **Release**: Root Changesets versioning and the gated release job in `.github/workflows/ci.yml` create release PRs and publish packages after verification. `fetcher` publishes on `beta`; stable packages publish on `latest`.
- **Documentation**: Root build, typecheck, and tests include `apps/docs`. Existing package-scoped sync workflows continue updating `ilokesto/docs` until production is switched, then are removed.
- **CI**: Root CI installs one lockfile, builds in dependency order, and preserves package-specific quality gates.
