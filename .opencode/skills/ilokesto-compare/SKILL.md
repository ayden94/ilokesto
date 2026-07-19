# ilokesto-compare

## Trigger

Load this skill when the user asks about a package's scope, comparable libraries, or the impact of a change on dependent packages.

## Subagent to invoke

- **Scope/comparison question**: `librarian` background agent.
- **Dependency impact analysis**: `oracle` agent or `explore` agent.

## Context to read

- `PACKAGES.md`
- `ARCHITECTURE.md`
- The relevant package's `package.json` and `README.md`

## Must do

- Reference at least 2 comparable libraries when answering scope questions.
- Explain how the package differs from those libraries.
- For impact questions, trace the dependency graph and list affected packages.

## Must not do

- Do not make definitive claims about external library internals without checking source.
- Do not guess version constraints; read `package.json` files.
