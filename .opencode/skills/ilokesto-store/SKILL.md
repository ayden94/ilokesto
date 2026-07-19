# ilokesto-store

## Trigger

Load this skill whenever the user is working on `@ilokesto/store`.

## Subagent to invoke

- **Implementation work**: `programming` category agent.
- **Comparison with Zustand/Valio/Jotai/Redux**: `librarian` background agent.

## Context to read

- `PACKAGES.md` store section
- `store/package.json`
- `store/src/index.ts` and related modules

## Must do

- Keep the API minimal and framework-agnostic.
- Maintain backward compatibility unless releasing a major version.
- Add tests in `store/src/index.test.ts` for new behavior.
- Use Changesets for any consumer-facing change.

## Must not do

- Do not introduce framework-specific code into `store`.
- Do not break dependent packages (`state`, `overlay`, `form`, `toast`) without a major bump.
