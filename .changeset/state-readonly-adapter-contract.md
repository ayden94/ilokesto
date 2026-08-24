---
"@ilokesto/state": major
---

Preserve `@ilokesto/store`'s `Readonly<T>` contract across the React, Vue, Angular, Svelte, and Solid adapters. Selector inputs, full-state reactive reads, lifecycle-free `readOnly()` results, and Svelte subscriptions now expose read-only state.

### Migration

Code that mutates adapter state in a selector, subscription, reactive result, or `readOnly()` result must move that update to the adapter writer. Replace mutation such as `state.count += 1` with an immutable next state through `writeOnly()`, `setState`, `update`, or `dispatch` as appropriate:

```ts
counter.writeOnly()((current) => ({ ...current, count: current.count + 1 }));
```
