---
name: ilokesto-utilinent
description: Use when working on `@ilokesto/utilinent` source or docs. Covers proxy-based polymorphic components like `Show`, `For`, and `Mount` for conditional and async rendering.
compatibility: opencode
metadata:
  language: en
  domain: ui
  package: utilinent
---

# ilokesto-utilinent

## Trigger

Load this skill when the user is working on `@ilokesto/utilinent`.

## Implementer routing

- **Implementation work**: `ilokesto-ui-implementer` agent with this skill and the `frontend` skill loaded.
- **Comparison with Radix utilities**: `librarian` background agent.

## Context to read

- `PACKAGES.md` utilinent section
- `packages/utilinent/package.json`
- `packages/utilinent/README.md`

## Must do

- Keep components small and composable.
- Preserve proxy-based polymorphic behavior.
- Ensure TypeScript types work with `react` >= 18.
- Run `pnpm --filter @ilokesto/utilinent build` and `pnpm --filter @ilokesto/utilinent test` before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not add internal ilokesto dependencies unless explicitly justified.
- Do not bloat the package with unrelated utilities.
- Do not run `npm publish` or `pnpm publish` locally.