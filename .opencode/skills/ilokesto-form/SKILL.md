# ilokesto-form

## Trigger

Load this skill whenever the user is working on `@ilokesto/form` source code, tests, examples, or documentation.

## Subagent to invoke

- **Implementation work**: `programming` category agent with this skill loaded.
- **API comparison with RHF/Formik/TanStack Form**: `librarian` background agent.
- **Architecture decisions**: `oracle` agent.

## Context to read

- `PACKAGES.md` form section
- `ARCHITECTURE.md` dependency graph
- `form/package.json`
- `form/README.md` and `form/README.ko.md`

## Must do

- Keep form state logic framework-agnostic in `form/src/core/`.
- Put React/Vue/Solid/Svelte adapters in `form/src/<framework>/`.
- Add or update tests in `form/test/` for core behavior changes.
- Use Changesets (`pnpm changeset`) for consumer-facing changes.

## Must not do

- Do not add framework-specific code to `form/src/core/`.
- Do not import `@ilokesto/store` internals that are not exported.
- Do not release without a changeset.
