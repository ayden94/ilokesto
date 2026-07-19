# ilokesto Subagent Routing

This file tells OpenCode which subagent or skill to invoke for different kinds of work in the ilokesto ecosystem.

## Package-specific work

When the user is working inside or asking about a specific package directory (`store/`, `state/`, `form/`, `overlay/`, `modal/`, `toast/`, `fetcher/`, `utilinent/`):

1. Load the matching `ilokesto-<package>` skill.
2. Delegate implementation work to the `programming` category agent with that skill loaded.
3. Use `explore` background agents for cross-file discovery inside the package repo.
4. Use `librarian` background agents when comparing to similar open-source libraries.

| Package | Skill | Comparable libraries |
|---|---|---|
| `store` | `ilokesto-store` | Zustand, Valtio, Jotai, Redux |
| `state` | `ilokesto-state` | Redux Toolkit, Pinia, Svelte stores |
| `form` | `ilokesto-form` | React Hook Form, Formik, TanStack Form |
| `overlay` | `ilokesto-overlay` | React Portals, Radix Dialog primitives |
| `modal` | `ilokesto-modal` | Radix Dialog, Headless UI Dialog |
| `toast` | `ilokesto-toast` | React-Toastify, Sonner, react-hot-toast |
| `fetcher` | `ilokesto-fetcher` | ky, ofetch, axios, openapi-fetch |
| `utilinent` | `ilokesto-utilinent` | Radix utilities, conditional rendering helpers |

## Cross-cutting work

| Task | Skill | Subagent / Notes |
|---|---|---|
| Add changeset or release package | `ilokesto-release` | Quick agent; edits package.json/.changeset files only |
| Sync package docs to ilokesto/docs | `ilokesto-docs-sync` | Quick agent; creates no-op commit or pushes docs change |
| Compare package scope or impact | `ilokesto-compare` | Oracle or librarian agent; read `PACKAGES.md` and `ARCHITECTURE.md` |
| Scaffold new package | `ilokesto-onboarding` | Plan agent first, then build agent; follow conventions in `AGENTS.md` |

## Default behavior

If the request does not match any package or cross-cutting skill:

1. Read `AGENTS.md`, `PACKAGES.md`, and `ARCHITECTURE.md` for context.
2. Ask the user which package or concern they are working on.
3. Do not assume a package context from ambiguous prompts.
