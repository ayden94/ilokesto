# @ilokesto/overlay

**English** | [한국어](./README.ko.md)

A small React overlay runtime built on top of `@ilokesto/store`.

This package provides a provider-scoped overlay core with a built-in host, item lifecycle management, and adapter injection. It is intentionally headless about modal or toast semantics so higher-level packages can build on top of the same runtime without leaking behavior into the core.

## Features

- **Provider-scoped runtime** — no global singleton; each `OverlayProvider` has its own store
- **Isolated contexts** — `createOverlayContext()` for multiple independent overlay stacks
- **Promise-based async overlays** — `display()` returns a Promise that resolves after exit animation
- **Two-phase dismiss** — `close()` triggers animation, `remove()` actually unmounts
- **Reject support** — `reject(id, reason)` rejects the Promise on `remove()` for error flows
- **Batch close** — `closeAll()` transitions all overlays to `closing` for batch exit animation
- **Adapter lifecycle hooks** — `onOpen`, `onClosing`, `onUnmount` via `useLifecycle`
- **Adapter plugins** — Provider-level common policies (logging, analytics, accessibility)
- **ID deduplication** — `open({ id })` is idempotent; no dangling promises
- **Single-item subscription** — `useOverlayItem(id)` with `Object.is` bailout
- **Open before Provider mount** — `store.open()` works without a mounted Provider

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Promise-Based Overlays](#promise-based-overlays)
- [Two-Phase Dismiss Lifecycle](#two-phase-dismiss-lifecycle)
- [Rejecting an Overlay](#rejecting-an-overlay)
- [Closing All Overlays](#closing-all-overlays)
- [Overlay ID and Deduplication](#overlay-id-and-deduplication)
- [Opening Overlays Before Provider Mount](#opening-overlays-before-provider-mount)
- [Isolated Overlay Contexts](#isolated-overlay-contexts)
- [Adapter Lifecycle Hooks](#adapter-lifecycle-hooks)
- [Adapter Plugins](#adapter-plugins)
- [API Reference](#api-reference)
- [Source Layout](#source-layout)
- [Development](#development)
- [License](#license)

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
  modal: ({ isOpen, close, useLifecycle, ...props }) => {
    useLifecycle({
      onOpen: () => { document.body.style.overflow = 'hidden'; },
      onUnmount: () => { document.body.style.overflow = ''; },
    });

    if (!isOpen) return null;

    return (
      <div role="dialog" aria-modal="true">
        <h1>{String(props.title)}</h1>
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

    console.log(result); // true or undefined
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

## Promise-Based Overlays

`display()` returns a `Promise<TResult | undefined>` that resolves when the overlay is fully removed (after exit animation):

```tsx
const confirmed = await display<boolean>({ type: 'modal', props: { ... } });
// confirmed === true  → user clicked confirm
// confirmed === false → user clicked cancel
// confirmed === undefined → overlay was removed without close
```

For fire-and-forget usage, use `open()` which returns just the `id`:

```tsx
const id = open({ type: 'toast', props: { message: 'Hello' } });
```

## Two-Phase Dismiss Lifecycle

The dismiss lifecycle has two phases, giving adapters full control over exit animation timing:

| Step | Function | What happens |
|---|---|---|
| 1 | `close(id, result)` | Status transitions to `closing`. `isOpen` becomes `false`. Adapter plays exit animation. |
| 2 | `remove(id)` | Item is removed from the store. Promise resolves with `closeResult`. |

The adapter receives both `close` and `remove` as props. It calls `close()` to trigger the animation, then `remove()` on animation end:

```tsx
const adapter = ({ isOpen, close, remove }) => {
  return (
    <div
      className={isOpen ? 'fade-in' : 'fade-out'}
      onAnimationEnd={() => { if (!isOpen) remove(); }}
    >
      <button onClick={() => close(true)}>Confirm</button>
    </div>
  );
};
```

## Rejecting an Overlay

`reject(id, reason)` transitions an overlay to `closing` (same as `close`), but when the adapter later calls `remove(id)`, the `display()` Promise is **rejected** with the reason instead of being resolved.

This is useful when an overlay represents a flow that can fail — for example, a login dialog cancelled by a timeout:

```tsx
function LoginButton() {
  const { open, reject, remove } = useOverlay();

  const handleLogin = () => {
    const id = open({ type: 'modal', props: { title: 'Sign in' } });

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

## Overlay ID and Deduplication

When `open()` is called with an explicit `id`, the store guards against duplicates:

- If an overlay with the same `id` is already open (or closing), `open()` returns the **existing** `OverlayRequest` — the same `id` and the same `Promise`.
- No second item is added to the store.
- The `Promise` is not duplicated, so there is no dangling promise.

This makes `open({ id, ... })` idempotent — calling it multiple times with the same `id` while the overlay is active has no side effect.

Once the overlay is removed (or cleared), the `id` is released and can be reused for a new overlay.

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

## Adapter Lifecycle Hooks

Adapters can register side-effect callbacks via the `useLifecycle` prop provided in `OverlayRenderProps`:

```tsx
const modalAdapter: OverlayAdapterComponent = ({ useLifecycle, isOpen, close }) => {
  useLifecycle({
    onOpen: (id) => { document.body.style.overflow = 'hidden'; },
    onClosing: (id) => { /* status just transitioned to "closing" */ },
    onUnmount: (id) => { document.body.style.overflow = ''; },
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

## Adapter Plugins

Plugins provide Provider-level common policies — logging, analytics, or default accessibility behavior — without modifying each adapter individually:

```tsx
import type { OverlayPlugin } from '@ilokesto/overlay';

const loggingPlugin: OverlayPlugin = {
  name: 'logging',
  onOpen: (id, item) => console.log('open', id, item.type),
  onClosing: (id, item) => console.log('closing', id, item.type),
  onUnmount: (id) => console.log('unmount', id),
};

<OverlayProvider adapters={adapters} plugins={[loggingPlugin]}>
  <App />
</OverlayProvider>
```

### Priority Rule

- If an adapter registers a hook for a phase via `useLifecycle`, **that hook takes priority** — plugins are skipped for that phase.
- If an adapter does not register a hook for a phase, **all plugins fire in registration order**.

This means an adapter can override specific phases (e.g., custom focus trap) while plugins handle the rest (e.g., logging).

## API Reference

### `createOverlayStore()`

Creates a provider-scoped overlay store. Returns `OverlayStoreApi` with `open`, `close`, `closeAll`, `reject`, `remove`, `clear`, `subscribe`, `getSnapshot`, `getInitialSnapshot`.

### `createOverlayContext()`

Creates an isolated React context. Returns `{ Provider, useOverlay, useOverlayItems, useOverlayItem }`.

### `OverlayProvider`

Context provider with built-in `OverlayHost`. Props: `adapters`, `children`, `store?`, `plugins?`.

### `useOverlay()`

Returns `{ display, open, close, closeAll, reject, remove, clear }`.

### `useOverlayItems()`

Returns `ReadonlyArray<OverlayItem>` — the current overlay item list.

### `useOverlayItem(id)`

Returns `OverlayItem | undefined` — subscribes to a single item by id with `Object.is` bailout.

### Types

- `OverlayStoreApi`, `OverlayProviderProps`, `OverlayItem`, `OverlayRequest`, `DisplayOptions`, `OverlayId`, `OverlayStatus`, `OverlayState`
- `OverlayAdapterComponent`, `OverlayAdapterMap`, `OverlayRenderProps`, `OverlayAdapterHooks`
- `OverlayPlugin`
- `OverlayContextInstance`, `OverlayContextValue`
- `UseOverlayReturn`

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
    plugin.ts
  index.ts
```

### Responsibilities

**`src/core`** — runtime implementation:
- `createOverlayStore.ts` — store with `open`, `close`, `closeAll`, `reject`, `remove`, `clear`
- `createOverlayContext.tsx` — factory for isolated React contexts
- `OverlayProvider.tsx` — default context instance re-export (backward compatible)
- `OverlayHost.tsx` — renders items via adapters, calls lifecycle hooks on status transitions
- `useOverlay.ts` — command API hook
- `useOverlayItems.ts` / `useOverlayItem.ts` — subscription hooks with `useSyncExternalStore`

**`src/contracts`** — shared types:
- `adapter.ts` — `OverlayRenderProps`, `OverlayAdapterComponent`, `OverlayAdapterMap`, `OverlayAdapterHooks`
- `overlay.ts` — `OverlayItem`, `OverlayStoreApi`, `DisplayOptions`, `OverlayProviderProps`
- `plugin.ts` — `OverlayPlugin`

### Dependency Direction

- `core/*` depends on `contracts/*`
- `contracts/overlay.ts` depends on `contracts/adapter.ts`
- `contracts/adapter.ts` does not depend on runtime code
- Adapter packages (modal, toast) should depend on `@ilokesto/overlay`
- `@ilokesto/overlay` should not import modal or toast implementations directly

The core owns lifecycle and hosting; adapter packages own semantics and presentation.

## Development

```bash
pnpm install
pnpm run build
pnpm test
```

Build outputs are generated in the `dist` directory. Tests run with Vitest and @testing-library/react.

## License

MIT