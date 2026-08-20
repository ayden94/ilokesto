---
"@ilokesto/state": patch
---

### Bug fixes and cleanup

#### `shallow()` false-positive for RegExp, Error, Promise, and other built-ins

`shallow()` compared objects with no enumerable own properties (RegExp, Error, Promise, class instances without data fields) via `Object.entries()`, which returns `[]` for these types. Two different references would incorrectly compare as shallow-equal, causing selector subscriptions to skip notifications for states containing these value types.

- **Fix**: Added a `RegExp` special case (compares `source` and `flags`, matching the existing `Date` pattern). Objects with zero enumerable own properties now fall back to reference equality unless they are plain objects (`Object.prototype` or `null` prototype), preserving the `shallow({}, {}) === true` behavior.
- **Tests**: 8 new cases in `test/shallow.test.ts` covering RegExp equality/inequality, Error, Promise, empty class instances, and empty plain objects.

#### Other fixes

- **`debounce` middleware**: replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` for cross-environment type safety (browser-only TS configs without `@types/node` no longer error).
- **`persist` cookie writes**: added `path=/` to the cookie string so persisted cookies are visible across all routes, not just the current path.
- **`persist` error log**: replaced the leftover `Caro-Kann` placeholder with `[@ilokesto/state/persist]`.

#### Cleanup

- **`storeCleanup.ts`**: removed the redundant `cleanupEntriesByStore` alias that pointed to the same `WeakMap` as `cleanupsByStore`.
- **`devtools` middleware**: replaced duck-typed `hasInitialState` (`'getInitialState' in value`) with `instanceof Store`, sharing the same `Store` import already used elsewhere.
- **`adaptor.ts`**: translated the Korean inline comment to English for codebase consistency.
- **`MemoryCookieDocument` test fake**: updated the cookie setter to parse cookie attributes (`path`, `max-age`, etc.) and store only the name=value pair, matching real browser behavior.