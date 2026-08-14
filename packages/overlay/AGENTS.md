# @ilokesto/overlay

This directory contains the `@ilokesto/overlay` package in the ilokesto pnpm monorepo.

## What this package is

A provider-scoped React overlay runtime for modals, toasts, and custom layers.

## When modifying this package

1. Read the root `AGENTS.md`, `PACKAGES.md`, and `ARCHITECTURE.md`.
2. Load the `ilokesto-overlay` skill from `.opencode/skills/ilokesto-overlay/SKILL.md`.
3. Maintain clear contracts between `OverlayHost`, `OverlayProvider`, and adapters.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before committing.
5. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a root changeset.
2. After merge to `main`, the root `release.yml` workflow opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not let this package depend on `modal` or `toast`.
- Do not leak framework-specific types from core contracts.
