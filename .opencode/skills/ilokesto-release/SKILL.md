---
name: ilokesto-release
description: Use when adding a changeset or preparing a release for any `@ilokesto/*` package. Covers root Changesets, semver bump rules, and the GitHub Actions release gate.
compatibility: opencode
metadata:
  language: en
  domain: release
  mode: knowledge
---

# ilokesto-release

## Trigger

Load this skill when the user wants to add a changeset, bump versions, or publish a package in any ilokesto repository.

## Implementer routing

- **Quick changeset or release flow**: `quick` category agent.
- **Versioning strategy questions**: `oracle` agent.
- **Release readiness review**: `ilokesto-docs-release-reviewer` agent.

## Context to read

- `ARCHITECTURE.md` release section
- The current package's `packages/<name>/package.json`
- `.changeset/config.json`
- Existing `.changeset/*.md` files

## Must do

- Run `pnpm changeset` interactively when possible.
- Use `patch` for bug fixes, `minor` for features, `major` for breaking changes.
- Ensure CI passes before merging a release PR.
- Place all changeset files at the repository root under `.changeset/`.

## Must not do

- Do not publish manually via `npm publish` or `pnpm publish`.
- Do not skip changesets for consumer-facing changes.
- Do not trigger release workflows directly; the root Changesets workflow is the sole release control plane.