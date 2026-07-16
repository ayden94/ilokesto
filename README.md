# @ilokesto/overlay

**English** | [한국어](./README.ko.md)

A small React overlay runtime built on top of `@ilokesto/store`.

This package provides a provider-scoped overlay core with a built-in host, item lifecycle management, and adapter injection. It is intentionally headless about modal or toast semantics so higher-level packages can build on top of the same runtime without leaking behavior into the core.

## Features

- Provider-scoped overlay runtime instead of a global singleton
- Built-in host that renders overlay items through an adapter registry
- Sync and async overlay opening through the same store lifecycle
- Clean separation between runtime core and shared contracts
- A small public API for opening, closing, removing, and observing overlays

## Installation

```bash
pnpm add @ilokesto/overlay react
```

or

```bash
npm install @ilokesto/overlay react
```

## Basic Usage

```tsx
import { OverlayProvider, useOverlay, type OverlayAdapterMap } from '@ilokesto/overlay';

const adapters: OverlayAdapterMap = {
  modal: ({ isOpen, close, title }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div role="dialog" aria-modal="true">
        <h1>{String(title)}</h1>
        <button onClick={() => close(true)}>Confirm</button>
      </div>
    );
  },
};

function ExampleButton() {
  const { display } = useOverlay();

  const handleClick = async () => {
    const result = await display<boolean>({
      type: 'modal',
      props: { title: 'Delete this item?' },
    });

    console.log(result);
  };

  return <button onClick={handleClick}>Open</button>;
}

export function App() {
  return (
    <OverlayProvider adapters={adapters}>
      <ExampleButton />
    </OverlayProvider>
  );
}
```

## Overlay ID and Deduplication

When `open()` is called with an explicit `id`, the store guards against duplicates:

- If an overlay with the same `id` is already open (or closing), `open()` returns the **existing** `OverlayRequest` — the same `id` and the same `Promise`.
- No second item is added to the store.
- The `Promise` is not duplicated, so there is no dangling promise.

This makes `open({ id, ... })` idempotent — calling it multiple times with the same `id` while the overlay is active has no side effect.

Once the overlay is removed (or cleared), the `id` is released and can be reused for a new overlay.

## Rejecting an Overlay

`reject(id, reason)` transitions an overlay to `closing` (same as `close`), but when the adapter later calls `remove(id)`, the `display()` Promise is **rejected** with the reason instead of being resolved.

This is useful when an overlay represents a flow that can fail — for example, a login dialog cancelled by a timeout:

```tsx
function LoginButton() {
  const { open, reject, remove } = useOverlay();

  const handleLogin = () => {
    const id = open({ type: 'modal', props: { title: 'Sign in' } });

    // Simulate a timeout that rejects the overlay
    setTimeout(() => {
      reject(id, new Error('Login timed out'));
      remove(id);
    }, 5000);
  };

  return <button onClick={handleLogin}>Sign in</button>;
}
```

The two-phase dismiss lifecycle is preserved: `reject` only transitions the status to `closing`; the adapter plays its exit animation and then calls `remove(id)`, which is when the Promise actually rejects.

## Closing All Overlays

`closeAll()` transitions every open overlay to `closing` in one call. Unlike `clear()`, it does **not** remove items from the store or settle promises — the adapter still controls the unmount timing for each overlay.

| | `closeAll()` | `clear()` |
|---|---|---|
| Status | All `open` → `closing` | Items removed immediately |
| Items in store | Remains | Emptied |
| Promises | Pending (settled on `remove`) | Settled immediately |
| Use case | Batch exit animation | Emergency cleanup |

```tsx
function CloseAllButton() {
  const { closeAll } = useOverlay();
  return <button onClick={closeAll}>Close all</button>;
}
```

## Source Layout

```text
src/
  core/
    createOverlayStore.ts
    createOverlayContext.tsx
    OverlayProvider.tsx
    OverlayHost.tsx
    useOverlay.ts
    useOverlayItems.ts
    useOverlayItem.ts
  contracts/
    adapter.ts
    overlay.ts
  index.ts
```

## Responsibilities

### `src/core`

- `createOverlayStore.ts` → creates the provider-scoped overlay store and manages `open`, `close`, `closeAll`, `reject`, `remove`, and `clear`
- `createOverlayContext.tsx` → factory that creates an isolated React context with its own Provider, useOverlay, useOverlayItems, and useOverlayItem
- `OverlayProvider.tsx` → re-exports the default context instance (Provider + hooks) for backward compatibility
- `OverlayHost.tsx` → reads the current overlay items, dispatches each item to `adapters[item.type]`, and calls adapter lifecycle hooks on status transitions
- `useOverlay.ts` → exposes the command API for opening, closing, rejecting, and dismissing overlays
- `useOverlayItems.ts` → subscribes to the current overlay item list with `useSyncExternalStore`
- `useOverlayItem.ts` → subscribes to a single overlay item by id with `useSyncExternalStore`

### `src/contracts`

- `adapter.ts` → adapter-facing rendering contracts such as `OverlayRenderProps`, `OverlayAdapterComponent`, and `OverlayAdapterMap`
- `overlay.ts` → overlay runtime contracts such as `OverlayItem`, `OverlayStoreApi`, `DisplayOptions`, and `OverlayProviderProps`

### `src/index.ts`

- Re-exports the runtime APIs from `core/*`
- Re-exports shared contract types from `contracts/*`

## Dependency Direction

- `core/*` depends on `contracts/*`
- `contracts/overlay.ts` depends on `contracts/adapter.ts`
- `contracts/adapter.ts` does not depend on runtime code
- Adapter packages such as modal or toast should depend on `@ilokesto/overlay`
- `@ilokesto/overlay` should not import modal or toast implementations directly

In short, the core owns lifecycle and hosting, while adapter packages own semantics and presentation.

## Opening Overlays Before Provider Mount

`store.open()` can be called before `OverlayProvider` is mounted — the item is stored immediately, and `useSyncExternalStore` picks it up on the Provider's first render. No event emitter is needed:

```tsx
const store = createOverlayStore();

// Called before any Provider exists
store.open({ id: 'early', type: 'modal' });

// Later — the item renders on first mount
<OverlayProvider adapters={adapters} store={store}>
  <App />
</OverlayProvider>
```

## Adapter Lifecycle Hooks

Adapters can register side-effect callbacks via the `useLifecycle` prop provided in `OverlayRenderProps`:

```tsx
const modalAdapter: OverlayAdapterComponent = ({ useLifecycle, isOpen, close }) => {
  useLifecycle({
    onOpen: (id) => {
      document.body.style.overflow = 'hidden';
    },
    onClosing: (id) => {
      // status just transitioned to "closing"
    },
    onUnmount: (id) => {
      document.body.style.overflow = '';
    },
  });

  if (!isOpen) return null;
  return <div role="dialog">...</div>;
};
```

The host calls hooks based on status transitions:

| Hook | When | Guaranteed |
|---|---|---|
| `onOpen(id, item)` | First mount with `status: "open"` | Once per open |
| `onClosing(id, item)` | `open → closing` transition | Once per close |
| `onUnmount(id)` | Component unmount (after `remove`) | Once per lifecycle |

If an adapter does not call `useLifecycle`, no hooks fire — the behavior is opt-in.

## Adapter Packages

This package is intentionally generic.

- A modal package can use the overlay runtime and inject modal adapters
- A toast package can use the same runtime and inject toast adapters
- Policies such as focus trapping, scroll lock, backdrop behavior, deduplication, timers, and animations belong in the adapter layer, not in the overlay core

## Isolated Overlay Contexts

By default, `OverlayProvider`, `useOverlay`, `useOverlayItems`, and `useOverlayItem` all share a single React context. If you need multiple independent overlay stacks (e.g., a main app and an embedded widget), use `createOverlayContext()`:

```tsx
import { createOverlayContext } from '@ilokesto/overlay';

const mainOverlay = createOverlayContext();
const widgetOverlay = createOverlayContext();

// Each context has its own Provider, store, and hooks — fully isolated.
<MainApp>
  <mainOverlay.Provider adapters={adapters}>
    <Sidebar />
  </mainOverlay.Provider>
</MainApp>

<Widget>
  <widgetOverlay.Provider adapters={adapters}>
    <WidgetContent />
  </widgetOverlay.Provider>
</Widget>
```

Each context instance provides:
- `Provider` — context provider with built-in `OverlayHost`
- `useOverlay` — command API (open, close, closeAll, reject, remove, clear)
- `useOverlayItems` — subscribes to the full item list
- `useOverlayItem(id)` — subscribes to a single item

The default exports (`OverlayProvider`, `useOverlay`, etc.) are a pre-created instance of `createOverlayContext()` for backward compatibility.

## Exports

- `@ilokesto/overlay` → `createOverlayStore`, `createOverlayContext`, `OverlayProvider`, `OverlayHost`, `useOverlay`, `useOverlayItems`, `useOverlayItem`
- `@ilokesto/overlay` types → contracts from `src/contracts/adapter.ts` (including `OverlayAdapterHooks`), `src/contracts/overlay.ts`, `UseOverlayReturn`, `OverlayContextInstance`, `OverlayContextValue`

## Development

```bash
pnpm install
pnpm run build
pnpm test
```

Build outputs are generated in the `dist` directory. Tests run with Vitest and @testing-library/react.

## License

MIT
