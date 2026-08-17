---
name: ilokesto-overlay
description: Use when working on `@ilokesto/overlay` source, tests, or docs. Covers the provider-scoped overlay runtime, two-phase dismiss, promise-based overlays, and adapter lifecycle hooks.
compatibility: opencode
metadata:
  language: en
  domain: ui
  package: overlay
---

# ilokesto-overlay

## Trigger

Load this skill when the user is working on `@ilokesto/overlay`.

## Implementer routing

- **Implementation work**: `ilokesto-ui-implementer` agent with this skill and the `frontend` skill loaded.
- **Comparison with React Portals/Radix**: `librarian` background agent.

## Context to read

- `PACKAGES.md` overlay section
- `ARCHITECTURE.md` overlay section
- `packages/overlay/package.json`
- `packages/overlay/README.md`

## Must do

- Keep the overlay runtime React-specific but lifecycle logic reusable.
- Maintain clear contracts between `OverlayHost`, `OverlayProvider`, and adapters.
- Add tests for lifecycle, plugin, and context behavior.
- Run `pnpm --filter @ilokesto/overlay typecheck`, `pnpm --filter @ilokesto/overlay test`, and `pnpm --filter @ilokesto/overlay build` before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not let `overlay` depend on `modal` or `toast`.
- Do not leak framework-specific types from core contracts.
- Do not run `npm publish` or `pnpm publish` locally.