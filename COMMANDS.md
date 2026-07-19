# ilokesto OpenCode Commands & Skills

This document lists OpenCode commands, subagent skills, and conventions defined for the ilokesto ecosystem.

## Global rules

- Always read `AGENTS.md` first when entering the ilokesto handbook repository.
- Load relevant skills from `.opencode/skills/` when working on a specific package or cross-cutting concern.
- Treat each package directory as an independent Git repository; do not commit cross-package changes in this handbook repo.
- Prefer conventions documented here over adding shared code between packages.

## Commands

Commands are triggered by user messages or slash commands. They route work to the right subagent or workflow.

### `/docs-sync`

Manually trigger the docs sync workflow for one or more packages.

- Reads each package's `.github/workflows/sync-docs.yml`
- Pushes a no-op change to `docs/` if needed to force a sync PR

### `/release-patch`

Adds a patch changeset to the current package and opens a release PR.

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
- Read `form/package.json`

Rules:
- Keep form state logic framework-agnostic in `form/src/core/`
- Put React/Vue/Solid/Svelte adapters in `form/src/<framework>/`
- Compare behavior to React Hook Form and TanStack Form when reviewing API changes
```

## Conventions

- Use package-specific `AGENTS.md` only for repo-local rules; ecosystem-wide rules live here.
- Skills should be loaded via `load_skills` in task delegation when a package is involved.
