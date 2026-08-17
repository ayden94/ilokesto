---
name: ilokesto-modal
description: Use when working on `@ilokesto/modal` source, tests, or docs. Covers the pre-built modal system on `@ilokesto/overlay`, inline and top-layer transports, focus management, and motion.
compatibility: opencode
metadata:
  language: en
  domain: ui
  package: modal
---

# ilokesto-modal

## Trigger

Load this skill when the user is working on `@ilokesto/modal`.

## Implementer routing

- **Implementation work**: `ilokesto-ui-implementer` agent with this skill and the `frontend` skill loaded.
- **Comparison with Radix/Headless UI**: `librarian` background agent.

## Context to read

- `PACKAGES.md` modal section
- `packages/modal/package.json`
- `packages/modal/README.md`

## Must do

- Build on `@ilokesto/overlay` lifecycle and adapter model.
- Provide both inline and top-layer adapters.
- Include accessibility tests (`test:a11y`) and e2e tests (`test:e2e`) for modal behavior.
- Run `pnpm --filter @ilokesto/modal test`, `pnpm --filter @ilokesto/modal test:e2e`, `pnpm --filter @ilokesto/modal test:a11y`, and `pnpm --filter @ilokesto/modal test:pack` before major changes.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not reimplement overlay logic inside `modal`.
- Do not add a direct dependency on `@ilokesto/store`; use `overlay` for state.
- Do not run `npm publish` or `pnpm publish` locally.