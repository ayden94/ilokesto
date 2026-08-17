---
name: ilokesto-docs-governance
description: Use when reviewing docs sync or package documentation structure. Covers Fumadocs layout, bilingual README rules, and the root `sync-docs.yml` workflow for the ilokesto monorepo.
compatibility: opencode
metadata:
  language: en
  domain: docs
  mode: knowledge
---

# ilokesto Docs Governance

This skill captures the documentation rules that `ilokesto-docs-release-reviewer` and `/docs-sync-check` enforce.

## Docs Live With Source

- Each package keeps documentation in `packages/<name>/docs/`.
- Root workflows sync package docs to `ilokesto/docs` via `.github/workflows/sync-docs.yml`.
- Package docs are excluded from npm publish tarballs via `packages/<name>/.npmignore`.

## Fumadocs Structure

Each `packages/<name>/docs/` folder should follow:

```text
docs/
├── meta.json
├── index.mdx
├── index.ko.mdx
└── ...topic files...
```

- `meta.json` declares page metadata and navigation order.
- `*.mdx` is the English source; `*.ko.mdx` is the Korean translation.
- Both languages must stay in sync for consumer-facing packages.

## Bilingual README

- Each package has `README.md` (English) and `README.ko.md` (Korean).
- The two must stay in sync for public API, examples, and migration notes.
- README is the canonical documentation until a separate docs site covers a topic.

## Sync Workflow

- Push changes to `main` to trigger `.github/workflows/sync-docs.yml`.
- The workflow opens a PR in `ilokesto/docs`.
- Do not edit `ilokesto/docs` directly unless fixing site-wide layout.

## Docs Sync Checklist

- [ ] `packages/<name>/docs/` follows Fumadocs structure.
- [ ] `meta.json` exists and declares navigation.
- [ ] English and Korean MDX files are in sync.
- [ ] `packages/<name>/.npmignore` excludes `docs/`.
- [ ] No direct edits to `ilokesto/docs`.