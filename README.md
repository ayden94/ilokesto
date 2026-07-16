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
- `OverlayProvider.tsx` → creates or receives a store, exposes it through context, and mounts the built-in `OverlayHost`
- `OverlayHost.tsx` → reads the current overlay items and dispatches each item to `adapters[item.type]`
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

## Adapter Packages

This package is intentionally generic.

- A modal package can use the overlay runtime and inject modal adapters
- A toast package can use the same runtime and inject toast adapters
- Policies such as focus trapping, scroll lock, backdrop behavior, deduplication, timers, and animations belong in the adapter layer, not in the overlay core

## Exports

- `@ilokesto/overlay` → `createOverlayStore`, `OverlayProvider`, `OverlayHost`, `useOverlay`, `useOverlayItems`, `useOverlayItem`
- `@ilokesto/overlay` types → contracts from `src/contracts/adapter.ts`, `src/contracts/overlay.ts`, and `UseOverlayReturn`

## Development

```bash
pnpm install
pnpm run build
pnpm test
```

Build outputs are generated in the `dist` directory. Tests run with Vitest and @testing-library/react.

## License

MIT
