# ilokesto-onboarding

## Trigger

Load this skill when the user wants to scaffold a new package for the ilokesto ecosystem.

## Subagent to invoke

1. **Planning**: `plan` category agent to define scope and conventions.
2. **Implementation**: `programming` category agent to create files.

## Context to read

- `AGENTS.md` core principles
- `PACKAGES.md` for naming and scope patterns
- `ARCHITECTURE.md` for dependency rules
- `store/package.json` and `store/.github/workflows/` as the simplest template

## Must do

- Create a new independent Git repository under `ilokesto/<package-name>`.
- Use `@changesets/cli` from the start.
- Add `ci.yml` and `release.yml` workflows.
- Add `docs/` with at least `index.mdx`, `index.ko.mdx`, and `meta.json`.
- Add `docs/` to `.npmignore`.
- Add a `sync-docs.yml` workflow.

## Must not do

- Do not create a package inside the handbook repo.
- Do not add dependencies on other ilokesto packages unless justified in `ARCHITECTURE.md`.
