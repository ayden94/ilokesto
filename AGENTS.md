# @ilokesto/utilinent

This repository contains the `@ilokesto/utilinent` package. It is an independent repository within the ilokesto ecosystem.

## What this package is

Utility React components and helpers for conditional rendering and async states.

## When modifying this package

1. Read the ilokesto handbook at `https://github.com/ilokesto/metarepo` (`AGENTS.md`, `PACKAGES.md`, `ARCHITECTURE.md`).
2. Load the `ilokesto-utilinent` skill from `.opencode/skills/ilokesto-utilinent/SKILL.md`.
3. Keep components small, composable, and proxy-based polymorphic.
4. Run `pnpm build` before committing (this package has no tests yet).
5. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a changeset.
2. After merge to `main`, the `release.yml` workflow opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not add internal ilokesto dependencies unless explicitly justified.
- Do not bloat the package with unrelated utilities.
