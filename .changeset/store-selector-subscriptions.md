---
"@ilokesto/store": minor
---

### Selector-aware subscriptions

Added `store.subscribeSelector(selector, listener, equalityFn?)` for subscribing to a derived slice of state instead of the whole store. The listener receives `(nextSelection, previousSelection)` and runs only when the selected value changes.

- `subscribeSelector` is a distinct method, not an overload of `subscribe`, so `subscribe(listener)` keeps its exact `(listener: () => void) => () => void` shape and `override subscribe(...)` continues to work in subclasses.
- The listener is not invoked immediately on registration; it runs only when the store updates and the selected value changes.
- Equality defaults to `Object.is`; pass a custom `equalityFn(previous, next)` to skip notifications for semantically equal selections (e.g. a user object with the same `id`).
- Selector subscriptions are plain listeners under the hood, so they follow the same rules as `subscribe`: they run synchronously after the state is stored, do not run when `setState()` resolves to the same reference, and are removed by calling the returned unsubscribe function.
- A selector throw at registration escapes the `subscribeSelector()` call and the listener is never added. An uncaught throw during notification propagates out of `setState()` and later listeners in that cycle are skipped.