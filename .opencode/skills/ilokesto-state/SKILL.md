# ilokesto-state

## Trigger

Load this skill when the user is working on `@ilokesto/state`.

## Subagent to invoke

- **Implementation work**: `programming` category agent.
- **Comparison with Redux Toolkit/Pinia/Svelte stores**: `librarian` background agent.

## Context to read

- `PACKAGES.md` state section
- `ARCHITECTURE.md` dependency graph
- `state/package.json`

## Must do

- Build state primitives on top of `@ilokesto/store`.
- Keep middleware and utility modules framework-agnostic where possible.
- Place framework bindings (`react`, `vue`, `solid`, `svelte`, `angular`) in separate subpaths.
- Use `bun test` for running tests.

## Must not do

- Do not duplicate `store` primitives in `state`.
- Do not break `@ilokesto/store` public API usage without a major bump.
