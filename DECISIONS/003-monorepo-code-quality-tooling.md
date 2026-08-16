# ADR 003: Own code quality tooling at the monorepo root

## Status

Accepted.

## Decision

Formatting, linting, typechecking, tests, builds, and distribution verification are repository-level policies. A package must not independently add or remove formatter and linter configuration, dependencies, scripts, or CI steps.

The legacy form-only Biome commit `d1a66855` is intentionally not ported. Its package-local `biome.json`, dependency, scripts, CI step, `.prettierrc` removal, and package-local changeset would create a second code-quality control plane inside the pnpm workspace.

Current verification remains TypeScript package checks, package tests, workspace builds, framework example checks, and packed-distribution smoke tests. A future Biome adoption must be workspace-wide and recorded by a separate decision.

## Consequences

- Packages share one code-quality policy and CI graph.
- Legacy package-local formatter or linter choices are migration inputs, not automatically preserved policy.
- Tooling changes that affect consumers still require a root changeset; policy-only documentation does not.
