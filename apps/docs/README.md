# Official ilokesto documentation

This private Next.js 16 / Fumadocs application was imported from
`ilokesto/docs` at `559cad3eb3d602f7a23734e2fece26b8bb88fbdc`.
It is part of the root pnpm workspace, not an independently installed project.

## Development

Use Node.js 22 and the root pinned pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

Open `http://localhost:3000/en` or `/ko`. All eight package sections use
`/<language>/<package>` without a `/docs` prefix.

## Content

Edit `packages/<package>/docs`, not this application. `source.config.ts`
defines a direct Fumadocs collection for each package. `lib/source.ts`
prefixes collection paths with the package name to preserve public URLs.
English `.mdx` and Korean `.ko.mdx` pages share their package metadata.
Fumadocs watches these source directories during development.

Site layout, search, localization, and route handlers live here. There is
no copied or generated package-content directory to edit or synchronize.

## Verification

```sh
pnpm docs:build
pnpm docs:typecheck
pnpm docs:test
pnpm docs:start
```

The build requires network access for the existing Google Inter font.
The root build, typecheck, and test commands also include this application.
The HTTP regression tests start an isolated production server, so build before
running them. Run root typecheck and tests sequentially: some existing package
tests rebuild shared distribution files.

Machine-readable routes include `/llms.txt`, `/llms-full.txt`, and
`/llms.mdx/docs/<language>/<package>/<page>/content.md`.
Open Graph images use `/og/docs/<language>/<package>/<page>/image.webp`.
For a package index, omit `<page>`.

## Deployment

The application is private and excluded from npm releases. See
[`DECISIONS/004-docs-in-monorepo.md`](../../DECISIONS/004-docs-in-monorepo.md)
for the deployment transition. This migration does not switch production or
remove the legacy documentation-sync workflows.
