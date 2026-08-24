---
"@ilokesto/state": major
---

Preserve `@ilokesto/store`'s `Readonly<T>` contract across the React, Vue, Angular, Svelte, and Solid adapters. Selector inputs, full-state reactive reads, lifecycle-free `readOnly()` results, and Svelte subscriptions now expose read-only state. Object state is `Readonly<T>`; callable state retains its call signature.

### Migration

Code that mutates adapter state in a selector, subscription, reactive result, or `readOnly()` result must move that update to the correct writer.

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
