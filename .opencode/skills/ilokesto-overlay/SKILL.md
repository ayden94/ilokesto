# ilokesto-overlay

## Trigger

Load this skill when the user is working on `@ilokesto/overlay`.

## Subagent to invoke

- **Implementation work**: `programming` category agent.
- **Comparison with React Portals/Radix**: `librarian` background agent.

## Context to read

- `PACKAGES.md` overlay section
- `ARCHITECTURE.md` overlay section
- `overlay/package.json`

## Must do

- Keep the overlay runtime React-specific but lifecycle logic reusable.
- Maintain clear contracts between `OverlayHost`, `OverlayProvider`, and adapters.
- Add tests for lifecycle, plugin, and context behavior.

## Must not do

- Do not let `overlay` depend on `modal` or `toast`.
- Do not leak framework-specific types from core contracts.
