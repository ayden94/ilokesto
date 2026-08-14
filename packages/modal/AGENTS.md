# @ilokesto/modal

This directory contains the `@ilokesto/modal` package in the ilokesto pnpm monorepo.

## What this package is

A pre-built modal system on top of `@ilokesto/overlay`.

## When modifying this package

1. Read the root `AGENTS.md`, `PACKAGES.md`, and `ARCHITECTURE.md`.
2. Load the `ilokesto-modal` skill from `.opencode/skills/ilokesto-modal/SKILL.md`.
3. Build on `@ilokesto/overlay` lifecycle and adapter model.
4. Run `pnpm test`, `pnpm test:e2e`, `pnpm test:a11y`, and `pnpm test:pack` before major changes.
5. Add a changeset with `pnpm changeset` for any consumer-facing change.

## Release flow

1. Open a PR with a root changeset.
2. After merge to `main`, the root `release.yml` workflow opens a `ci: release` PR.
3. Merge the release PR to publish to npm.

## Must not do

- Do not reimplement overlay logic inside this package.
- Do not add a direct dependency on `@ilokesto/store`.
