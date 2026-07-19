# @ilokesto/store

This repository contains the `@ilokesto/store` package. It is an independent repository within the ilokesto ecosystem.

## What this package is

A small, atomic, framework-agnostic state container with selector-driven subscriptions.

## When modifying this package

1. Read the ilokesto handbook at `https://github.com/ilokesto/metarepo` (`AGENTS.md`, `PACKAGES.md`, `ARCHITECTURE.md`).
2. Load the `ilokesto-store` skill from `.opencode/skills/ilokesto-store/SKILL.md`.
3. Keep the public API minimal and backward-compatible.
4. Add tests in `src/index.test.ts` for new behavior.
5. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before committing.
6. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a changeset.
2. After merge to `main`, the `release.yml` workflow opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not add framework-specific code to this package.
- Do not break dependent packages (`state`, `overlay`, `form`, `toast`) without a major version bump.
- Do not publish manually without going through the Changesets workflow.
