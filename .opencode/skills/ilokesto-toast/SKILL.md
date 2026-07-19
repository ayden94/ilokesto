# ilokesto-toast

## Trigger

Load this skill when the user is working on `@ilokesto/toast`.

## Subagent to invoke

- **Implementation work**: `programming` or `visual-engineering` category agent.
- **Comparison with Sonner/React-Toastify**: `librarian` background agent.

## Context to read

- `PACKAGES.md` toast section
- `toast/package.json`
- `toast/README.md`

## Must do

- Build on `@ilokesto/overlay` for item lifecycle.
- Keep motion, position, and auto-dismiss behavior configurable.
- Add tests for runtime and store behavior.

## Must not do

- Do not duplicate overlay item management in `toast`.
- Avoid direct `@ilokesto/store` usage unless overlay does not expose needed APIs.
