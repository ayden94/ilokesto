---
name: ilokesto-onboarding
description: Use when scaffolding a new package inside the ilokesto monorepo. Covers workspace registration, package layout, Changesets, CI, and docs sync conventions.
compatibility: opencode
metadata:
  language: en
  domain: onboarding
  mode: knowledge
---

# ilokesto-onboarding

## Trigger

Load this skill when the user wants to scaffold a new package for the ilokesto ecosystem.

## Implementer routing

1. **Planning**: `plan` category agent to define scope and conventions.
2. **Implementation**: `ilokesto-scoped-implementer` agent to create files.

## Context to read

- `AGENTS.md` core principles
- `PACKAGES.md` for naming and scope patterns
- `ARCHITECTURE.md` for dependency rules
- `packages/store/package.json` as the simplest template
- `.github/workflows/` for CI and release conventions

## Must do

- Create the new package under `packages/<name>/` inside this monorepo.
- Add the package to `pnpm-workspace.yaml` (already covered by `packages/*` glob).
- Use root `@changesets/cli` configuration; do not add a package-local changeset config.
- Add `ci.yml` and `release.yml` workflows at the repository root or extend existing ones.
- Add `packages/<name>/docs/` with at least `index.mdx`, `index.ko.mdx`, and `meta.json`.
- Add `docs/` to `packages/<name>/.npmignore`.
- Add a `packages/<name>/AGENTS.md` with package-local rules.

## Must not do

- Do not create a package outside this monorepo as a separate Git repository.
- Do not add a package-local `.changeset/config.json`.
- Do not add dependencies on other ilokesto packages unless justified in `ARCHITECTURE.md`.
- Do not run `npm publish` or `pnpm publish` locally.