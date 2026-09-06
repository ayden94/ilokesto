# @ilokesto/modal

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
- 1e8c413: Guarantee modal removal with a closing fallback that fires when no `animationend` event occurs (for example when a consumer sets `style={{ animation: 'none' }}`), while retaining `animationend` as the normal fast path. The fallback reads the effective animation duration and is canceled when the fast path completes.
- 3e5c3dc: Scope `onModalClose` de-duplication to each `ModalProvider`'s lifecycle store so two providers with distinct stores can reuse the same explicit id without suppressing or duplicating each other's close callbacks. Duplicate open requests for an already-pending id no longer reset that item's notification state.
- f98eefa: Scope modal stack policy to each ModalProvider so providers with distinct stores no longer interfere with inline or top-layer ordering, dismissal, and focus behavior. Fixes #10.
- a42911e: Dismiss top-layer modals only when a click lands on the native dialog backdrop, not its content or padding. Fixes #11.
- Updated dependencies [1e02b6c]
- Updated dependencies [fdf305c]
- Updated dependencies [50f99c2]
- Updated dependencies [de8ebec]
- Updated dependencies [dc598b5]
  - @ilokesto/overlay@2.0.0
