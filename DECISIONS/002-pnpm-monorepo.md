# ADR 002: Adopt a pnpm monorepo

## Status

Accepted. Supersedes the independent-repository decision in the original metarepo architecture.

## Decision

The eight publishable ilokesto packages live under `packages/` in one pnpm 10.17.1 workspace. They share one lockfile, CI pipeline, Changesets configuration, and release workflow while retaining independent package versions and changelogs.

Existing package histories were imported with unsquashed Git subtrees from each `ci/pnpm-package-manager` branch. Auxiliary refs were retained under `refs/imports/<package>/` to avoid collisions between legacy tags. Verified `git bundle --all` backups were created before nested repositories were retired.

Top-level `docs/` and `playground/` remain separate repositories and are not workspace projects. Package documentation remains beside source and is synchronized by root workflows.

## Consequences

- Cross-package changes can be developed, tested, reviewed, and released from one branch.
- Internal dependencies use the pnpm workspace protocol and publish as normal semver ranges.
- Runtime source and public package versions are unchanged by the migration.
- Legacy package remotes are not modified or archived by this decision.
