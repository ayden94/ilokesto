---
"@ilokesto/state": major
---

Preserve `@ilokesto/store`'s `Readonly<T>` contract across the React, Vue, Angular, Svelte, and Solid adapters. Selector inputs, full-state reactive reads, lifecycle-free `readOnly()` results, and Svelte subscriptions expose `Readonly<T>` for object state. Callable state remains exact `T`, preserving arbitrary generic and overloaded signatures; its own-property modifiers remain as declared.

### Migration

Code that mutates object adapter state in a selector, subscription, reactive result, or `readOnly()` result must move that update to the correct writer. Callable state preserves the mutability of its declared own properties.

For plain state, use an immutable updater through `writeOnly()`, `setState`, or Svelte's `update`:

```ts
counter.writeOnly()((current) => ({ ...current, count: current.count + 1 }));
```

For reducer state, dispatch a typed action. The reducer computes the next state:

```ts
type CounterAction = { readonly type: 'increment' };

const counter = create(
  (state: { readonly count: number }, action: CounterAction) => {
    switch (action.type) {
      case 'increment':
        return { count: state.count + 1 };
    }
  },
  { count: 0 },
);

counter.writeOnly()({ type: 'increment' });
```
