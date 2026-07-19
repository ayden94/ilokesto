# ilokesto-release

## Trigger

Load this skill when the user wants to add a changeset, bump versions, or publish a package in any ilokesto repository.

## Subagent to invoke

- **Quick changeset or release flow**: `quick` category agent.
- **Versioning strategy questions**: `oracle` agent.

## Context to read

- `ARCHITECTURE.md` release section
- The current package's `package.json`
- The current package's `.changeset/config.json`
- Existing `.changeset/*.md` files

## Must do

- Run `pnpm changeset` interactively when possible.
- Use `patch` for bug fixes, `minor` for features, `major` for breaking changes.
- Ensure CI passes before merging a release PR.

## Must not do

- Do not publish manually without going through the Changesets workflow.
- Do not skip changesets for consumer-facing changes.
