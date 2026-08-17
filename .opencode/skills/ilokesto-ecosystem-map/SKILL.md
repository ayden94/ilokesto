---
name: ilokesto-ecosystem-map
description: Use when routing work across the ilokesto monorepo. Captures package groups, dependency direction, comparable libraries, and which implementer/reviewer to dispatch per package.
compatibility: opencode
metadata:
  language: en
  domain: governance
  mode: knowledge
---

# ilokesto Ecosystem Map

This skill is the routing knowledge for the ilokesto monorepo. Commands and agents consult it to pick the right implementer, reviewer, and package skill.

## Package Groups

| Group | Packages | Implementer | Primary Reviewers |
|---|---|---|---|
| `state-core` | `store`, `state` | `ilokesto-scoped-implementer` | `contract-reviewer`, `code-reviewer`, `verification-reviewer` |
| `forms` | `form` | `ilokesto-scoped-implementer` (core) / `ilokesto-ui-implementer` (adapters) | `contract-reviewer`, `code-reviewer`, `verification-reviewer` |
| `http` | `fetcher` | `ilokesto-scoped-implementer` | `contract-reviewer`, `code-reviewer`, `verification-reviewer` |
| `overlay-runtime` | `overlay` | `ilokesto-ui-implementer` | `contract-reviewer`, `code-reviewer`, `verification-reviewer` |
| `overlay-adapters` | `modal`, `toast` | `ilokesto-ui-implementer` | `contract-reviewer`, `code-reviewer`, `verification-reviewer`, `docs-release-reviewer` (a11y) |
| `ui-utilities` | `utilinent` | `ilokesto-ui-implementer` | `code-reviewer`, `verification-reviewer` |

## Dependency Direction

```text
store
  └─ state
  └─ overlay
       ├─ modal
       └─ toast
form (depends on store)
fetcher (standalone)
utilinent (standalone)
```

- `store` must not depend on any other ilokesto package.
- `overlay` must not depend on `modal` or `toast`.
- `modal` and `toast` depend on `overlay`, not on `store` directly.
- `fetcher` and `utilinent` are standalone.
- A breaking change in `store` affects `state`, `overlay`, `modal`, `toast`, and `form`.

## Comparable Libraries

| Package | Comparable |
|---|---|
| `store` | Zustand, Valtio, Jotai, Redux |
| `state` | Redux Toolkit, Pinia, Svelte stores |
| `form` | React Hook Form, Formik, TanStack Form |
| `overlay` | React Portals, Radix Dialog primitives |
| `modal` | Radix Dialog, Headless UI Dialog |
| `toast` | React-Toastify, Sonner, react-hot-toast |
| `fetcher` | ky, ofetch, axios, openapi-fetch |
| `utilinent` | Radix utilities, conditional rendering helpers |

## Routing Rules

- If the change touches `store`, `state`, `form/core`, or `fetcher` only, use `ilokesto-scoped-implementer`.
- If the change touches `overlay`, `modal`, `toast`, `utilinent`, or any framework adapter, use `ilokesto-ui-implementer`.
- If a single change spans both groups, split the task: one implementer per group, with a shared plan.
- For multi-package changes, `/create-lane` should split work per package to keep worktrees isolated.
- Release and docs changes always pass through `ilokesto-docs-release-reviewer`.
- Issue drafts from `/search-issue` always pass through `ilokesto-issue-registration-reviewer` before any GitHub issue creation.