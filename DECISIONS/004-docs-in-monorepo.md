# Official documentation in the monorepo

## Decision

The official Next.js/Fumadocs site lives in `apps/docs` as the private
`@ilokesto/docs` workspace. Package documentation remains canonical in
`packages/<name>/docs`. Do not maintain a second editable copy in the site.

This supersedes the separate documentation repository boundary in decision 002.
The playground remains outside this workspace. Package versions and npm release
order are unchanged; private workspaces are neither versioned nor tagged by
Changesets.

## Local validation

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm docs:build
pnpm docs:typecheck
pnpm docs:test
pnpm docs:start
```

Validate English and Korean package pages, navigation, search, and machine-readable
documentation before switching production. Preserve existing public URLs.

## Production transition

This local migration does not change the production project, domain, or repository.
The deployment provider's project configuration must be inspected before making
external changes; it is not encoded in the source repository.

After approval:

1. Connect a preview deployment to `ayden94/ilokesto`.
2. Configure `apps/docs` as the application directory and permit access to files
   outside that directory. Installation must use the root pnpm workspace and
   lockfile; package documentation outside the app must be included.
3. Use Node.js 22 and the pinned pnpm version. From the repository root, the build
   command is `pnpm docs:build`. The application uses the Next.js deployment
   integration, not a static-export directory.
4. Verify the preview's bilingual routes, search, LLM endpoints, and image routes.
5. Switch the existing production domain only after preview verification.
6. Remove `.github/workflows/sync-docs-*.yml` and `_sync-docs.yml` after production
   uses this monorepo. Until then they continue updating the existing site.
7. Retire the old documentation repository only with explicit approval.

Keep the old deployment available for rollback until the new production site is
verified. Do not publish the documentation application to npm.
