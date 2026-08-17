---
name: ilokesto-state
description: Use when working on `@ilokesto/state` source, tests, or docs. Covers multi-framework state adapters built on `@ilokesto/store`, middleware, and the `pipe` builder.
compatibility: opencode
metadata:
  language: en
  domain: state
  package: state
---

# ilokesto-state

## Trigger

Load this skill when the user is working on `@ilokesto/state`.

## Implementer routing

- **Implementation work**: `ilokesto-scoped-implementer` agent with this skill loaded.
- **Comparison with Redux Toolkit/Pinia/Svelte stores**: `librarian` background agent.

## Context to read

- `PACKAGES.md` state section
- `ARCHITECTURE.md` dependency graph
- `packages/state/package.json`
- `packages/state/README.md`

## Must do

- Build state primitives on top of `@ilokesto/store`.
- Keep middleware and utility modules framework-agnostic where possible.
- Place framework bindings (`react`, `vue`, `solid`, `svelte`, `angular`) in separate subpaths under `packages/state/src/`.
- Run `pnpm --filter @ilokesto/state test` (uses Vitest) before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not duplicate `store` primitives in `state`.
- Do not break `@ilokesto/store` public API usage without a major bump.
- Do not run `npm publish` or `pnpm publish` locally; release is GitHub Actions only via root Changesets.