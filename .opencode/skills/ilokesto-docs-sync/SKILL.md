# ilokesto-docs-sync

## Trigger

Load this skill when the user wants to sync a package's `docs/` folder to the central `ilokesto/docs` repository.

## Subagent to invoke

- **Trigger sync workflow or create a no-op change**: `quick` category agent.
- **Docs structure or Fumadocs questions**: `visual-engineering` category agent or `librarian`.

## Context to read

- The current package's `.github/workflows/sync-docs.yml`
- `ARCHITECTURE.md` docs section
- `docs/content/docs/<package>/` if the central docs repo is available locally

## Must do

- Ensure the package's `docs/` folder follows the Fumadocs structure (meta.json, *.mdx, *.ko.mdx).
- Push changes to `main` to trigger the `sync-docs` workflow.
- Verify a PR appears in `ilokesto/docs` after the workflow runs.

## Must not do

- Do not edit `ilokesto/docs` directly unless fixing site-wide layout.
- Do not include docs in npm publish tarballs (check `.npmignore`).
