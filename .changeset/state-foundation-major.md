---
"@ilokesto/store": major
"@ilokesto/state": major
"@ilokesto/form": major
"@ilokesto/overlay": major
"@ilokesto/toast": major
"@ilokesto/modal": major
---

Rebuild the shared state foundation with synchronous FIFO commit-snapshot
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
