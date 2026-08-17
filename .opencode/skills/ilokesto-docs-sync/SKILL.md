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

Load this skill when the user wants to sync a package's `docs/` folder to the central `ilokesto/docs` repository.

## Implementer routing

- **Trigger sync workflow or create a no-op change**: `quick` category agent.
- **Docs structure or Fumadocs questions**: `visual-engineering` category agent or `librarian`.

## Context to read

- `.github/workflows/sync-docs.yml` (root workflow)
- `ARCHITECTURE.md` docs section
- `packages/<name>/docs/` structure

## Must do

- Ensure each package's `docs/` folder follows the Fumadocs structure (`meta.json`, `*.mdx`, `*.ko.mdx`).
- Push changes to `main` to trigger the root `sync-docs.yml` workflow.
- Verify a PR appears in `ilokesto/docs` after the workflow runs.

## Must not do

- Do not edit `ilokesto/docs` directly unless fixing site-wide layout.
- Do not include docs in npm publish tarballs (check `packages/<name>/.npmignore`).
- Do not run `npm publish` or `pnpm publish` locally.