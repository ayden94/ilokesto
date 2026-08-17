---
name: ilokesto-fetcher
description: Use when working on `@ilokesto/fetcher` source, tests, or docs. Covers the OpenAPI-aware `ky` wrapper, typed shortcuts, grouped request contract, and `safe` surface.
compatibility: opencode
metadata:
  language: en
  domain: http
  package: fetcher
---

# ilokesto-fetcher

## Trigger

Load this skill when the user is working on `@ilokesto/fetcher`.

## Implementer routing

- **Implementation work**: `ilokesto-scoped-implementer` agent with this skill loaded.
- **Comparison with ky/ofetch/axios/openapi-fetch**: `librarian` background agent.

## Context to read

- `PACKAGES.md` fetcher section
- `packages/fetcher/package.json`
- `packages/fetcher/README.md`

## Must do

- Preserve `ky`'s runtime ergonomics.
- Maintain OpenAPI-aware type inference.
- Run `pnpm --filter @ilokesto/fetcher typecheck`, `pnpm --filter @ilokesto/fetcher test`, `pnpm --filter @ilokesto/fetcher build`, and `pnpm --filter @ilokesto/fetcher test:dist` before committing.
- Add a root changeset under `.changeset/` for consumer-facing changes.

## Must not do

- Do not add internal ilokesto dependencies; `fetcher` is standalone.
- Do not break the public `ky`-like API without a major bump.
- Do not run `npm publish` or `pnpm publish` locally.