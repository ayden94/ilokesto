---
name: ilokesto-form
description: Use when working on `@ilokesto/form` source, tests, or docs. Covers the headless form core, Standard Schema validation, tuple paths, and React/Vue/Solid/Svelte adapters.
compatibility: opencode
metadata:
  language: en
  domain: forms
  package: form
---

# ilokesto-form

## Trigger

Load this skill whenever the user is working on `@ilokesto/form` source code, tests, examples, or documentation.

## Implementer routing

- **Implementation work**: `ilokesto-scoped-implementer` agent with this skill loaded.
- **UI/adapter work**: `ilokesto-ui-implementer` agent with this skill and the `frontend` skill loaded.
- **API comparison with RHF/Formik/TanStack Form**: `librarian` background agent.
- **Architecture decisions**: `oracle` agent.

## Context to read

- `PACKAGES.md` form section
- `ARCHITECTURE.md` dependency graph
- `packages/form/package.json`
- `packages/form/README.md` and `packages/form/README.ko.md`

## Must do

- Keep form state logic framework-agnostic in `packages/form/src/core/`.
- Put React/Vue/Solid/Svelte adapters in `packages/form/src/<framework>/`.
- Add or update tests in `packages/form/test/` for core behavior changes.
- Run `pnpm --filter @ilokesto/form typecheck`, `pnpm --filter @ilokesto/form test`, and `pnpm --filter @ilokesto/form build` before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not add framework-specific code to `packages/form/src/core/`.
- Do not import `@ilokesto/store` internals that are not exported.
- Do not release without a changeset.
- Do not run `npm publish` or `pnpm publish` locally.