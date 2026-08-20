# @ilokesto/overlay

## 1.1.1

### Patch Changes

- 1e02b6c: Introduce Changesets for automated versioning and changelog management
- fdf305c: Report missing overlay adapters once per mounted item in development while keeping production and item lifecycle behavior unchanged.
- 50f99c2: Tie `onUnmount` lifecycle hooks to overlay store removal so provider teardown does not end a still-pending item lifecycle.
- de8ebec: Prevent consumer item props from overriding runtime-controlled adapter props such as `close`, `remove`, and `isOpen`.
- Updated dependencies [c850635]
- Updated dependencies [f3be972]
  - @ilokesto/store@1.2.0
