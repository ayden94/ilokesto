# ilokesto-fetcher

## Trigger

Load this skill when the user is working on `@ilokesto/fetcher`.

## Subagent to invoke

- **Implementation work**: `programming` category agent.
- **Comparison with ky/ofetch/axios/openapi-fetch**: `librarian` background agent.

## Context to read

- `PACKAGES.md` fetcher section
- `fetcher/package.json`
- `fetcher/README.md`

## Must do

- Preserve `ky`'s runtime ergonomics.
- Maintain OpenAPI-aware type inference.
- Run `test:dist` after build to verify published package.

## Must not do

- Do not add internal ilokesto dependencies; `fetcher` is standalone.
- Do not break the public `ky`-like API without a major bump.
