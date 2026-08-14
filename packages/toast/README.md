# @ilokesto/toast

**English** | [한국어](./README.ko.md)

A React toast package built for practical `react-hot-toast` replacement quality.

`@ilokesto/toast` provides a provider-scoped toast runtime, a familiar `toast.*` facade, a polished default renderer, headless hooks, and an optional top-layer transport. Internally it uses `@ilokesto/overlay` for presence lifecycle only, while toast policy and rendering stay inside this package.

## Features

- Familiar facade: `toast()`, `toast.success()`, `toast.error()`, `toast.loading()`, `toast.custom()`, `toast.promise()`
- Provider-scoped runtimes separated by `toasterId`
- Default `Toaster` with built-in card UI, animated status icons, spinner, and enter/exit motion
- Per-toast options such as `style`, `className`, `icon`, `iconTheme`, `removeDelay`, `position`, `duration`, and `ariaProps`
- `toastOptions` merge order of global → per-type → per-toast options
- Headless `useToaster()` for custom renderers
- Optional `transport="top-layer"` mode powered by manual popover

## Installation

```bash
pnpm add @ilokesto/toast react react-dom
```

or

```bash
npm install @ilokesto/toast react react-dom
```

## Basic Usage

```tsx
import { Toaster, toast } from '@ilokesto/toast';

function App() {
  return (
    <>
      <button onClick={() => toast.success('Saved successfully')}>Show toast</button>
      <Toaster />
    </>
  );
}
```

## Promise Toasts

```tsx
import { Toaster, toast } from '@ilokesto/toast';

async function savePost() {
  return fetch('/api/posts', { method: 'POST' });
}

toast.promise(savePost(), {
  loading: 'Saving post…',
  success: 'Post saved',
  error: (error) => `Save failed: ${String(error)}`,
});

export function App() {
  return <Toaster />;
}
```

## Custom Rendering

### `Toaster` children

```tsx
import { Toaster } from '@ilokesto/toast';

export function App() {
  return (
    <Toaster>
      {(toast, { dismiss }) => (
        <button onClick={dismiss}>
          {toast.message}
        </button>
      )}
    </Toaster>
  );
}
```

### `ToastBar`

```tsx
import { ToastBar, Toaster } from '@ilokesto/toast';

export function App() {
  return (
    <Toaster>
      {(toast) => (
        <ToastBar toast={toast}>
          {({ icon, message }) => (
            <>
              {message}
              {icon}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
```

## Top-Layer Transport

`@ilokesto/toast` adds an extra rendering mode that `react-hot-toast` does not provide:

```tsx
<Toaster transport="top-layer" />
```

This uses manual popover when the browser supports it and falls back to inline rendering when it does not.

## Headless Usage

`useToaster()` exposes the visible toast list and runtime helpers:

```ts
const { toasts, handlers } = useToaster();
```

Available handlers:

- `updateHeight`
- `startPause`
- `endPause`
- `calculateOffset`

This hook is intended for advanced integrations that run under the mounted `Toaster` context.

## Source Layout

```text
src/
  components/
    ToastBar.tsx
    ToastProvider.tsx
    Toaster.tsx
    icons.tsx
  core/
    createToastRuntime.ts
    createToastStore.ts
    registry.ts
    toast.ts
    utils.ts
  hooks/
    useToaster.ts
    useToastItems.ts
  types/
    toast.ts
  index.ts
```

## Responsibilities

### `src/components`

- `Toaster.tsx` → mounts the visible toast stack, configures runtime view options, and provides the default container
- `ToastBar.tsx` → composable default renderer primitive for a single toast row
- `icons.tsx` → built-in spinner and status icon components used by the default renderer
- `ToastProvider.tsx` → creates and registers provider-scoped runtimes by `toasterId`

### `src/core`

- `toast.ts` → the public `toast.*` facade
- `createToastRuntime.ts` → toast policy layer for ids, timers, promise transitions, dismiss/remove behavior, and visible-set calculation
- `createToastStore.ts` → raw toast state store
- `registry.ts` → runtime registration by `toasterId`
- `utils.ts` → default durations, ids, icon themes, and small helpers

### `src/hooks`

- `useToaster.ts` → headless hook returning `{ toasts, handlers }`
- `useToastItems.ts` → subscribes to the current visible toast items

### `src/types`

- `toast.ts` → public contracts for runtime APIs, props, item state, and options

### `src/index.ts`

- re-exports the public runtime, renderer, hook, and type surface

## Exports

- values → `toast`, `Toaster`, `ToastBar`, `ToastIcon`, `useToaster`, `useToastItems`, `createToastRuntime`
- types → `ToastBarProps`, `ToastOptions`, `DefaultToastOptions`, `ToasterProps`, `UseToasterResult`, and related toast contracts

## Migration

If you are moving from `react-hot-toast`, see [MIGRATION_FROM_REACT_HOT_TOAST.md](./MIGRATION_FROM_REACT_HOT_TOAST.md).

## Development

```bash
pnpm install
pnpm run build
```

Build outputs are generated in the `dist` directory.

## License

MIT
