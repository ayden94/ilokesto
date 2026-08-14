# ilokesto OpenCode Commands & Skills

This document lists OpenCode commands, subagent skills, and conventions defined for the ilokesto ecosystem.

## Global rules

- Always read `AGENTS.md` first when entering the ilokesto handbook repository.
- Load relevant skills from `.opencode/skills/` when working on a specific package or cross-cutting concern.
- Treat `packages/*` as one Git repository and one pnpm workspace; cross-package changes should be atomic and dependency-aware.
- Prefer conventions documented here over adding shared code between packages.

## Commands

Commands are triggered by user messages or slash commands. They route work to the right subagent or workflow.

### `/docs-sync`

Manually trigger the docs sync workflow for one or more packages.

- Uses the root package-scoped docs sync workflows.
- Watches `packages/<name>/docs/` and opens a sync PR in `ilokesto/docs`.

### `/release-patch`

Adds a root changeset for the selected package. The gated release job opens the release PR after CI passes on `main`.

### `/compare-scope`

Given a package name, reads `PACKAGES.md` and returns the package's scope plus comparable open-source libraries.

## Subagent skills

Place concrete skill definitions in `SKILLS/`. Each skill is a markdown file with:

- Trigger: when to load it
- Context: what files to read
- Rules: what the agent must/must not do

### Example: `SKILLS/ilokesto-form.md`

```markdown
# ilokesto-form skill

Trigger: working on `@ilokesto/form`

Context:
- Read `PACKAGES.md` form section
- Read `packages/form/package.json`

Rules:
- Keep form state logic framework-agnostic in `packages/form/src/core/`
- Put React/Vue/Solid/Svelte adapters in `packages/form/src/<framework>/`
- Compare behavior to React Hook Form and TanStack Form when reviewing API changes
```

## Conventions

- Use `packages/<name>/AGENTS.md` for package-local rules; ecosystem-wide rules live here.
- Skills should be loaded via `load_skills` in task delegation when a package is involved.
- Run package scripts with `pnpm --filter @ilokesto/<name> <script>`.
