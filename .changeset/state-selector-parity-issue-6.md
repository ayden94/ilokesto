---
"@ilokesto/state": patch
---

Unify plain and reducer selector subscriptions across the React, Vue, Angular, Solid, and Svelte adapters. All adapters now use `Store.subscribeSelector` with shared shallow equality, skip unrelated updates, preserve framework lifecycle cleanup, and retain React's initial-state server snapshot behavior.
