---
name: ilokesto-release-governance
description: Use when reviewing a change for release readiness. Covers Changesets rules, semver policy, dist-tag rules, and the GitHub Actions release gate for the ilokesto monorepo.
compatibility: opencode
metadata:
  language: en
  domain: release
  mode: knowledge
---

# ilokesto Release Governance

This skill captures the release and publish rules that `ilokesto-docs-release-reviewer` and `/release-readiness` enforce.

## Changesets ONLY

- The Changesets release workflow is the sole source of truth for versioning and changelogs.
- Consumer-facing changes to any `@ilokesto/*` package must include a `.changeset/*.md` file at the repository root.
- Package-local changeset configs are not allowed; the root `.changeset/config.json` is the only config.

## Semver Policy

| Change | Bump |
|---|---|
| Bug fix, no API change | `patch` |
| New feature, backward compatible | `minor` |
| Breaking API change | `major` |
| Docs-only, no runtime change | no changeset required |

## Dist-Tag Rules

- `fetcher` publishes with the `beta` dist-tag during its pre-release phase.
- Other packages use the default `latest` dist-tag unless the package `package.json` declares otherwise.
- Dist-tag changes require a root changeset and maintainer approval.

## No Local Publish

- Running `npm publish` or `pnpm publish` locally is strictly forbidden.
- All publishing must occur via GitHub Actions (canonical path: `.github/workflows/release.yml`).
- The release job opens a `ci: release` PR after CI passes on `main`; merging that PR publishes to npm.

## Major Release Approval

- PRs carrying `major` changesets require explicit maintainer approval and consumer-facing migration notes before merge.

## Release Readiness Checklist

- [ ] `.changeset/*.md` exists for every consumer-facing change.
- [ ] Changeset semver bump matches the change type.
- [ ] `pnpm typecheck`, `pnpm test`, and `pnpm build` pass for affected packages.
- [ ] `pnpm --filter @ilokesto/fetcher test:dist` passes if `fetcher` is affected.
- [ ] No local publish commands were run.
- [ ] PR body includes migration notes for `major` changes.