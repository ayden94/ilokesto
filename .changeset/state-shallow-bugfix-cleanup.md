---
"@ilokesto/state": patch
---

### Bug fixes and cleanup

#### `shallow()` false-positive for RegExp, Error, Promise, and other built-ins

`shallow()` compared objects with no enumerable own properties (RegExp, Error, Promise, class instances without data fields) via `Object.entries()`, which returns `[]` for these types. Two different references would incorrectly compare as shallow-equal, causing selector subscriptions to skip notifications for states containing these value types.

- **Fix**: Added a `RegExp` special case (compares `source` and `flags`, matching the existing `Date` pattern). Objects with zero enumerable own properties now fall back to reference equality unless they are plain objects (`Object.prototype` or `null` prototype), preserving the `shallow({}, {}) === true` behavior.
- **Tests**: 8 new cases in `test/shallow.test.ts`.

#### `validate` middleware `onError` option

Validation failures and async schema detection were silently swallowed with only a `console.error`. The `validate` middleware now accepts an optional `onError` callback (defaults to `console.error`). Throw inside `onError` to propagate the error to the caller of `setState`.

- **Tests**: 3 new cases in `test/pipe-validate.test.ts`.

#### Other fixes

- **`debounce` middleware**: replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` for cross-environment type safety.
- **`persist` cookie writes**: added `path=/` so persisted cookies are visible across all routes.
- **`persist` error log**: replaced the leftover `Caro-Kann` placeholder with `[@ilokesto/state/persist]`.
- **`persist` write cache**: removed the unbounded module-level `storageWriteCache` Map. Write deduplication is now per-store-instance via `lastEncodedValue`, eliminating the memory leak for apps with many persisted stores.

#### Cleanup

- **`storeCleanup.ts`**: removed the redundant `cleanupEntriesByStore` alias.
- **`devtools` middleware**: replaced duck-typed `hasInitialState` with `instanceof Store`.
- **`adaptor.ts`**: translated the Korean inline comment to English.
- **Adapter dedup**: extracted shared `identity` and `createDispatch` helpers to `core/shared/`, removing duplication across all 5 framework adapters.
- **`getStore.ts`**: improved `reducerByStore` WeakMap typing from `object` to a function type.
- **JSDoc**: added JSDoc with `@param`, `@returns`, and `@example` to all public API exports — `create` (5 frameworks), `pipe`, `definePipeableMiddleware`, `adaptor`, `debounce`, `throttle`, `logger`, `validate`, `devtools`, `history`, `persist`, `dispose`, and key types (`UseState`, `UseReducer`, `ReducerAction`, `ReduceFn`, `HistoryControls`, `HistoryOptions`, `PersistControls`).

#### Docs

- **selector-semantics**: replaced outdated `deepCompare` references with the current `shallow` comparison table, including RegExp and built-in reference-equality behavior. Updated both EN and KO.
- **persist**: updated cookie write description to reflect `path=/`. Updated both EN and KO.
- **validate**: documented the new `onError` option and custom error handling. Updated both EN and KO.
- **troubleshooting**: verified existing content remains accurate.

#### Test helper

- **`MemoryCookieDocument`**: updated the cookie setter to parse cookie attributes (`path`, `max-age`, etc.) and store only the name=value pair, matching real browser behavior.