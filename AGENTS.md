# @ilokesto/toast

This repository contains the `@ilokesto/toast` package. It is an independent repository within the ilokesto ecosystem.

## What this package is

A toast notification system on top of `@ilokesto/overlay`.

## When modifying this package

1. Read the ilokesto handbook at `https://github.com/ilokesto/metarepo` (`AGENTS.md`, `PACKAGES.md`, `ARCHITECTURE.md`).
2. Load the `ilokesto-toast` skill from `.opencode/skills/ilokesto-toast/SKILL.md`.
3. Build on `@ilokesto/overlay` for item lifecycle.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before committing.
5. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a changeset.
2. After merge to `main`, the `release.yml` workflow opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not duplicate overlay item management here.
- Avoid direct `@ilokesto/store` usage unless overlay does not expose needed APIs.
