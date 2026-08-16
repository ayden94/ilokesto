---
"@ilokesto/form": major
---

Port legacy post-import form fixes and features into the monorepo.

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
