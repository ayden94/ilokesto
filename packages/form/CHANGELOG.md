# @ilokesto/form

## 2.0.0

### Major Changes

- 0fa1cb0: Port legacy post-import form fixes and features into the monorepo.

  - Add MIT `LICENSE` file and include `LICENSE`/`README.md`/`README.ko.md` in the published `files` list; correct the README private/publishConfig statement.
  - Add `isFocused: boolean` to `FieldState`. `form.focus(path)` now sets `isFocused: true` instead of being a no-op. `form.blur(path)` always clears `isFocused` regardless of `validateOn`. `FormArrayRebaser` carries `isFocused` across `move`/`swap`/`insert`/`remove`. `FormStateSummary` gains `focusedField: string | null` (first focused field in `Object.entries` order, or `null`). React/Vue/Solid `useFormState` return types expose `focusedField`.
  - Add reactive `values`/`resetOptions` support to the Vue adapter via `VueFormOptions<TValues>` with `values?: MaybeRefOrGetter<TValues>`. When `values` changes by reference, the adapter calls `form.reset(values, resetOptions)`, mirroring the React adapter.
  - Make async validation target-aware. Independent fields can validate concurrently, overlapping work becomes stale, and submit retries against the latest value snapshot before invoking `onValid`.
  - Add `useField` to the Svelte adapter as a breaking `Readable<SvelteFieldSnapshot>` surface with `props` and `setValue`; consume field state through `$field` or `get(field)`.
  - Export `VueFormOptions` from `@ilokesto/form/vue` and align Vue binding event/value types with `v-bind` contracts.
  - Add core unit tests for `ValueHelper`, `FormPath`, `FormStateInitializer`, `FormArrayMutationPlanner`, and `FormArrayRebaser`.
  - Build importable ESM and declarations with tsup, verify all public subpaths from an isolated packed consumer, and include all examples in the root workspace build/typecheck graph.
  - Document ESM-only policy, PathKey encoding performance considerations, and immer bundle size considerations in README (EN/KO).
  - Add Vue/Solid/Svelte login and React validation flow examples.

### Minor Changes

- 05f02b2: Add reference-based reactive `values` and value-driven `resetOptions` contracts for the React, Vue, Solid, and Svelte adapters.

### Patch Changes

- 1e02b6c: Introduce Changesets for automated versioning and changelog management
- b7e264c: Serialize concurrent submit validation and callbacks so every submission settles without validation-token livelock.
- 6819f03: Align form documentation with the actual public contract: use `defaultValues` (not the non-existent `initialValues`) in all examples and prose, and document only the types the root entrypoint actually exports. `FieldState` and `FormState` are now described as runtime shapes returned by `getFieldState()` and `getState()`, not as root imports.
- 31b4ba6: Preserve stable render keys for sibling and structurally surviving nested arrays when another array is mutated.
- Updated dependencies [c850635]
- Updated dependencies [f3be972]
  - @ilokesto/store@1.2.0
