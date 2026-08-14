# @ilokesto/form

This directory contains the `@ilokesto/form` package in the ilokesto pnpm monorepo.

## What this package is

Headless form state management: field registration, validation flow, array fields, and submit handling.

## When modifying this package

1. Read the root `AGENTS.md`, `PACKAGES.md`, and `ARCHITECTURE.md`.
2. Load the `ilokesto-form` skill from `.opencode/skills/ilokesto-form/SKILL.md`.
3. Keep core form state logic framework-agnostic in `src/core/`.
4. Put React/Vue/Solid/Svelte adapters in `src/<framework>/`.
5. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before committing.
6. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a root changeset.
2. After CI passes on `main`, the root workflow's release job opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not add framework-specific code to `src/core/`.
- Do not import private internals from `@ilokesto/store`.
