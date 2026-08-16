---
"@ilokesto/form": patch
---

Port legacy post-import form fixes and features into the monorepo.

- Add MIT `LICENSE` file and include `LICENSE`/`README.md`/`README.ko.md` in the published `files` list; correct the README private/publishConfig statement.
- Add `isFocused: boolean` to `FieldState`. `form.focus(path)` now sets `isFocused: true` instead of being a no-op. `form.blur(path)` always clears `isFocused` regardless of `validateOn`. `FormArrayRebaser` carries `isFocused` across `move`/`swap`/`insert`/`remove`. `FormStateSummary` gains `focusedField: string | null` (first focused field in `Object.entries` order, or `null`). React/Vue/Solid `useFormState` return types expose `focusedField`.
- Add reactive `values`/`resetOptions` support to the Vue adapter via `VueFormOptions<TValues>` with `values?: MaybeRefOrGetter<TValues>`. When `values` changes by reference, the adapter calls `form.reset(values, resetOptions)`, mirroring the React adapter.
- Guard async validation against race conditions via an internal generation counter in `ValidationEngine`. Stale async schema results are discarded so rapid typing with async validators always reflects the most recent values. Affects `validateField`, `validateFields`, and `validateRegisteredFields`.
- Add `useField` to the Svelte adapter for API parity with React/Vue/Solid, returning `{ props, value, setValue, errors, dirty, touched }` with a bound register action and field-local schema cleanup.
- Add core unit tests for `ValueHelper`, `FormPath`, `FormStateInitializer`, `FormArrayMutationPlanner`, and `FormArrayRebaser`.
- Enable sourcemaps and preserve JSDoc in `tsconfig.json`; remove dead `build.lib` vite config (vitest-only now); remove `.npmignore` (the `files` field controls the tarball).
- Document ESM-only policy, PathKey encoding performance considerations, and immer bundle size considerations in README (EN/KO).
- Add Vue/Solid/Svelte login and React validation flow examples.