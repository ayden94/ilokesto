# ilokesto-modal

## Trigger

Load this skill when the user is working on `@ilokesto/modal`.

## Subagent to invoke

- **Implementation work**: `programming` or `visual-engineering` category agent.
- **Comparison with Radix/Headless UI**: `librarian` background agent.

## Context to read

- `PACKAGES.md` modal section
- `modal/package.json`
- `modal/README.md`

## Must do

- Build on `@ilokesto/overlay` lifecycle and adapter model.
- Provide both inline and top-layer adapters.
- Include accessibility tests (`test:a11y`) and e2e tests (`test:e2e`) for modal behavior.

## Must not do

- Do not reimplement overlay logic inside `modal`.
- Do not add direct dependency on `@ilokesto/store`; use `overlay` for state.
