# @ilokesto/toast

## 2.0.0

### Major Changes

- dc598b5: Rebuild the shared state foundation with synchronous FIFO commit-snapshot
  notifications, immediate subscription disposal, independent callback registrations,
  and aggregated delivery errors. These are intentional observable changes from
  recursive, fail-fast notification delivery.

  Expose structural ReadableStore and StoreApi contracts, createStore, and explicit
  set/update operations. State now exports framework-neutral construction and
  composition from its root, createReducer handles, and bind/bindReducer entrypoints
  for React, Vue, Solid, Svelte, and Angular. Existing convenience creators share the
  same foundation, and Svelte set now stores callable values without invoking them.
  Reducer results also preserve callable value identity, and handles retain the
  capability types of an explicitly supplied Store.

  Migrate Form, Overlay, and Toast to the new Store construction surface; Modal
  inherits Overlay's updated notification foundation. Preserve framework support,
  middleware ordering, reducer metadata, SSR snapshots, and package capabilities.
  Packed Form verification inherits the root pnpm version so its local Store
  tarball override is honored in isolated consumer projects.

  See the bilingual State advanced migration guide and Store notification semantics.
  Version application and publishing are intentionally left to a later Changesets run.

### Patch Changes

- 53d16e2: Correct documentation frontmatter, MDX comments, and table syntax so package-owned content builds in the official monorepo documentation application.
- 76560b8: Introduce Changesets for automated versioning and changelog management
- 2df07e4: Resolve facade-created toasts without an explicit position to the mounted Toaster's configured position. Fixes #49.
- 9c3db7c: Preserve the configured toast position when using the manual-popover top-layer transport. Fixes #42.
- 5aeba19: Clear removed Toaster default options for future toasts while preserving already resolved toast items. Fixes #12.
- Updated dependencies [1e02b6c]
- Updated dependencies [fdf305c]
- Updated dependencies [50f99c2]
- Updated dependencies [de8ebec]
- Updated dependencies [dc598b5]
- Updated dependencies [c850635]
- Updated dependencies [f3be972]
  - @ilokesto/overlay@2.0.0
  - @ilokesto/store@2.0.0
