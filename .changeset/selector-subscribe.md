---
"@ilokesto/store": minor
---

Add a selector-aware `subscribe` overload: `subscribe(selector, listener, equalityFn?)` returns an unsubscribe function, does not invoke the listener immediately, calls it with `(nextSelection, previousSelection)` when the selected slice changes, and skips notifications when the default `Object.is` (or a custom `equalityFn`) considers the previous and next selections equal.
