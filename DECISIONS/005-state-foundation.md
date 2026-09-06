# State foundation for the next major version

## Scope

Rebuild Store notification delivery and separate state construction from framework
binding. Preserve supported frameworks, middleware capabilities, synchronous
commits, subclass support, and package boundaries. Do not apply versions or deploy.

## Contracts

- Export structural `ReadableStore<T>` and `StoreApi<T>` contracts from Store.
- Keep the Store class for subclass-based integrations; add `createStore` as the
  ordinary construction API.
- Add explicit `set(value)` and `update(updater)` operations. A function passed
  to `set` is a value; `setState` retains its value-or-updater semantics.
- Commit immediately, then deliver notification records synchronously in FIFO
  order. Each record captures state and subscription membership at commit time.
  Selectors evaluate the captured state; `getState()` always reads the latest
  committed state.
- Each subscription owns its disposer, even when callbacks are identical.
  Unsubscribe takes effect immediately, including pending delivery.
- Continue through callback failures and queued records, then throw an
  `AggregateError` containing original errors in delivery order. Committed state
  is not rolled back.
- State's root entry exports framework-neutral construction and composition APIs.
  `createReducer` returns an explicit `{ store, dispatch }` handle. Framework
  `bind` and `bindReducer` entrypoints consume already-created state.
- Keep existing `create` entrypoints operational; they remain convenience
  constructors, not a second runtime. No broad duck typing of plain state.

## Major-version changes

Reentrant delivery is FIFO rather than recursive. Removed listeners no longer run
from a stale delivery snapshot. Duplicate callback subscriptions are independent.
Listener failures are aggregated rather than starving later subscribers.

Public construction and framework binding are separate so one store can be used
by services and more than one framework without hidden recreation. Existing
middleware registration, reducer identity, cleanup, and SSR snapshots must retain
their tested behavior.
