# @ilokesto/toast

This directory contains the `@ilokesto/toast` package in the ilokesto pnpm monorepo.

## What this package is

A toast notification system on top of `@ilokesto/overlay`.

## When modifying this package

1. Read the root `AGENTS.md`, `PACKAGES.md`, and `ARCHITECTURE.md`.
2. Load the `ilokesto-toast` skill from `.opencode/skills/ilokesto-toast/SKILL.md`.
3. Build on `@ilokesto/overlay` for item lifecycle.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before committing.
5. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a root changeset.
2. After merge to `main`, the root `release.yml` workflow opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not duplicate overlay item management here.
- Avoid direct `@ilokesto/store` usage unless overlay does not expose needed APIs.
