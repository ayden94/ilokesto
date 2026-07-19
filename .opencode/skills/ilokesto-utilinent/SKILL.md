# ilokesto-utilinent

## Trigger

Load this skill when the user is working on `@ilokesto/utilinent`.

## Subagent to invoke

- **Implementation work**: `programming` or `visual-engineering` category agent.
- **Comparison with Radix utilities**: `librarian` background agent.

## Context to read

- `PACKAGES.md` utilinent section
- `utilinent/package.json`
- `utilinent/README.md`

## Must do

- Keep components small and composable.
- Preserve proxy-based polymorphic behavior.
- Ensure TypeScript types work with `react` >= 18.

## Must not do

- Do not add internal ilokesto dependencies unless explicitly justified.
- Do not bloat the package with unrelated utilities.
