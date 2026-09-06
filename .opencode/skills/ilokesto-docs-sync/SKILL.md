---
name: ilokesto-docs-sync
description: Use when syncing a package's `docs/` folder to the central `ilokesto/docs` repository. Covers Fumadocs structure and the root `sync-docs.yml` workflow.
compatibility: opencode
metadata:
  language: en
  domain: docs
  mode: knowledge
---

# ilokesto-docs-sync

## Trigger

Load this skill when connecting package documentation to `apps/docs`, or maintaining legacy synchronization during the production transition.

## Implementer routing

- **Trigger sync workflow or create a no-op change**: `quick` category agent.
- **Docs structure or Fumadocs questions**: `visual-engineering` category agent or `librarian`.

## Context to read

- `apps/docs/README.md`
- `DECISIONS/004-docs-in-monorepo.md`
- `.github/workflows/_sync-docs.yml` and `sync-docs-*.yml` (legacy workflows)
- `ARCHITECTURE.md` docs section
- `packages/<name>/docs/` structure

## Must do

- Ensure each package's `docs/` folder follows the Fumadocs structure (`meta.json`, `*.mdx`, `*.ko.mdx`).
- Run `pnpm docs:test`, `pnpm docs:typecheck`, and `pnpm docs:build` locally.
- Keep package content canonical in `packages/<name>/docs/`; site code belongs in `apps/docs`.
- Preserve legacy sync until production uses this monorepo. External deployment changes require approval.

## Must not do

- Do not maintain a duplicate editable package-doc tree in `apps/docs`.
- Do not include docs in npm publish tarballs (check `packages/<name>/.npmignore`).
- Do not run `npm publish` or `pnpm publish` locally.
