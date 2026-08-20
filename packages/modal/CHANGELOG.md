# @ilokesto/modal

## 1.1.1

### Patch Changes

- 76560b8: Introduce Changesets for automated versioning and changelog management
- 1e8c413: Guarantee modal removal with a closing fallback that fires when no `animationend` event occurs (for example when a consumer sets `style={{ animation: 'none' }}`), while retaining `animationend` as the normal fast path. The fallback reads the effective animation duration and is canceled when the fast path completes.
- 3e5c3dc: Scope `onModalClose` de-duplication to each `ModalProvider`'s lifecycle store so two providers with distinct stores can reuse the same explicit id without suppressing or duplicating each other's close callbacks. Duplicate open requests for an already-pending id no longer reset that item's notification state.
- f98eefa: Scope modal stack policy to each ModalProvider so providers with distinct stores no longer interfere with inline or top-layer ordering, dismissal, and focus behavior. Fixes #10.
- a42911e: Dismiss top-layer modals only when a click lands on the native dialog backdrop, not its content or padding. Fixes #11.
- Updated dependencies [1e02b6c]
- Updated dependencies [fdf305c]
- Updated dependencies [50f99c2]
- Updated dependencies [de8ebec]
  - @ilokesto/overlay@1.1.1
