---
name: ilokesto-compare
description: Use when comparing an ilokesto package's scope to similar open-source libraries or analyzing the cross-package impact of a change. Read-only analysis skill.
compatibility: opencode
metadata:
  language: en
  domain: governance
  mode: knowledge
---

# ilokesto-compare

## Trigger

Load this skill when the user asks about a package's scope, comparable libraries, or the impact of a change on dependent packages.

## Implementer routing

- **Scope/comparison question**: `librarian` background agent.
- **Dependency impact analysis**: `oracle` agent or `explore` agent.

## Context to read

- `PACKAGES.md`
- `ARCHITECTURE.md`
- The relevant package's `packages/<name>/package.json` and `packages/<name>/README.md`

## Must do

- Reference at least 2 comparable libraries when answering scope questions.
- Explain how the package differs from those libraries.
- For impact questions, trace the dependency graph and list affected packages.
- Use `pnpm --filter @ilokesto/<name> ...` for package-scoped commands.

## Must not do

- Do not make definitive claims about external library internals without checking source.
- Do not guess version constraints; read `packages/<name>/package.json` files.
- Do not edit files; this is a read-only analysis skill.