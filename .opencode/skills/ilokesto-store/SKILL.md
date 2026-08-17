---
name: ilokesto-store
description: Use when working on `@ilokesto/store` source, tests, or docs. Covers the framework-agnostic `Store<T>` core, selector subscriptions, and middleware chain rules.
compatibility: opencode
metadata:
  language: en
  domain: state
  package: store
---

# ilokesto-store

## Trigger

Load this skill whenever the user is working on `@ilokesto/store`.

## Implementer routing

- **Implementation work**: `ilokesto-scoped-implementer` agent with this skill loaded.
- **Comparison with Zustand/Valtio/Jotai/Redux**: `librarian` background agent.
- **Architecture tradeoffs**: `oracle` agent.

## Context to read

- `PACKAGES.md` store section
- `ARCHITECTURE.md` dependency graph
- `packages/store/package.json`
- `packages/store/src/index.ts` and related modules

## Must do

- Keep the API minimal and framework-agnostic.
- Maintain backward compatibility unless releasing a major version.
- Add tests in `packages/store/src/index.test.ts` for new behavior.
- Run `pnpm --filter @ilokesto/store typecheck`, `pnpm --filter @ilokesto/store test`, and `pnpm --filter @ilokesto/store build` before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not introduce framework-specific code into `store`.
- Do not break dependent packages (`state`, `overlay`, `form`, `toast`) without a major bump.
- Do not run `npm publish` or `pnpm publish` locally; release is GitHub Actions only via root Changesets.
- Do not edit outside the assigned worktree without explicit approval.