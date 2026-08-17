---
name: ilokesto-toast
description: Use when working on `@ilokesto/toast` source, tests, or docs. Covers the toast runtime on `@ilokesto/overlay`, the `toast.*` facade, default renderer, and top-layer transport.
compatibility: opencode
metadata:
  language: en
  domain: ui
  package: toast
---

# ilokesto-toast

## Trigger

Load this skill when the user is working on `@ilokesto/toast`.

## Implementer routing

- **Implementation work**: `ilokesto-ui-implementer` agent with this skill and the `frontend` skill loaded.
- **Comparison with Sonner/React-Toastify**: `librarian` background agent.

## Context to read

- `PACKAGES.md` toast section
- `packages/toast/package.json`
- `packages/toast/README.md`

## Must do

- Build on `@ilokesto/overlay` for item lifecycle.
- Keep motion, position, and auto-dismiss behavior configurable.
- Add tests for runtime and store behavior.
- Run `pnpm --filter @ilokesto/toast typecheck`, `pnpm --filter @ilokesto/toast test`, and `pnpm --filter @ilokesto/toast build` before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not duplicate overlay item management in `toast`.
- Avoid direct `@ilokesto/store` usage unless overlay does not expose needed APIs.
- Do not run `npm publish` or `pnpm publish` locally.