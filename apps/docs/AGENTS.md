# Documentation application

Read the repository root `AGENTS.md` and `ARCHITECTURE.md` first.

- This is the private official Next.js/Fumadocs site.
- Package content is canonical in `../../packages/<package>/docs`.
- Do not copy package MDX into this application.
- Preserve `/en/<package>` and `/ko/<package>` URLs when changing collection loading.
- Preserve the current component system and appearance during the migration.
- Run the root `docs:test`, `docs:typecheck`, and `docs:build` commands.
- Verify navigation, language switching, search, Markdown, and image routes.
- Deployment changes and removal of legacy sync require the production transition
  described in `../../DECISIONS/004-docs-in-monorepo.md`.
