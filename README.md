# @ilokesto/modal

**English** | [한국어](./README.ko.md)

A React modal package built on top of `@ilokesto/overlay`, following Grunfeld’s awaitable dialog philosophy with smoother default motion.

`@ilokesto/modal` keeps modal policy inside the package: dismiss rules, focus handling, scroll lock, inline vs top-layer transport, backdrop behavior, and enter/exit animation. It uses `@ilokesto/overlay` only for presence lifecycle, so modal content can stay mounted during the closing phase and resolve after the exit motion finishes.

## Features

- Awaitable modal flows through `display()`
- Hook-based API with `useModal()`
- Global facade with `modal` and `globalModalStore`
- Default inline transport with smoother fade/scale motion
- Optional native top-layer transport with `<dialog>`
- ESC and backdrop light-dismiss support
- Focus restore and simple focus trapping
- Inline body scroll lock
- Position options such as `center`, `top`, `bottom-right`, and other edge/corner placements
- Reduced-motion aware exit behavior

## Installation

```bash
pnpm add @ilokesto/modal react
```

or

```bash
npm install @ilokesto/modal react
```

## Basic Usage

Modal content is provided through `render`. The render callback receives a `close(result)` function scoped to that specific modal instance, plus context for that modal. Use `render: () => ...` for static content too.

```tsx
import { ModalProvider, useModal } from '@ilokesto/modal';

function ConfirmContent({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        minWidth: 320,
        padding: 24,
        borderRadius: 16,
        background: '#ffffff',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.24)',
      }}
    >
      <h2>Delete item?</h2>
      <p>This action cannot be undone.</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm}>Delete</button>
      </div>
    </div>
  );
}

function DeleteButton() {
  const { display } = useModal();

  const handleClick = async () => {
    const modalId = 'delete-confirm';

    const confirmed = await display<boolean>({
      id: modalId,
      position: 'center',
      dismissible: true,
      ariaLabelledBy: 'delete-confirm-title',
      ariaDescribedBy: 'delete-confirm-description',
      render: (close) => (
        <ConfirmContent
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      ),
    });

    console.log(confirmed);
  };

  return <button onClick={handleClick}>Open modal</button>;
}

export function App() {
  return (
    <ModalProvider>
      <DeleteButton />
    </ModalProvider>
  );
}
```

## Close Lifecycle

Use `onModalClose(result)` when you need a callback whenever the modal is closed. Calling the scoped `close(result)` from `render` triggers that modal's callback once with the same result. Calling `clear()` triggers `onModalClose` for every open modal in stack order before removing them.

`onDismiss` is narrower: it only fires when a dismissible modal is dismissed by ESC or backdrop click.

### closeAll and onModalClose

`closeAll()` transitions all open modals to `closing` without setting `closeResult`. The lifecycle store does **not** fire `onModalClose` during `closeAll()` itself. However, when the adapter subsequently calls `remove(id)` for each modal (after exit animation), `onModalClose(undefined)` fires indirectly because `closeResult` is `undefined`.

| Sequence | `onModalClose` argument |
|---|---|
| `close(id, result)` → `remove(id)` | `result` |
| `closeAll()` → `remove(id)` | `undefined` |
| `remove(id)` (without close) | `undefined` |
| `clear()` | `closeResult` or `undefined` |

If you need to distinguish batch-close from individual-close in `onModalClose`, check a flag before calling `closeAll()` or use a separate `onDismiss` handler.

## Global Facade

If you prefer a module-level API, mount a default `ModalProvider` once and then use the exported `modal` facade.

```tsx
import { ModalProvider, modal } from '@ilokesto/modal';

function App() {
  return <ModalProvider>{/* your app */}</ModalProvider>;
}

async function openGlobalConfirm() {
  const modalId = 'global-confirm';

  const result = await modal.display<boolean>({
    id: modalId,
    render: (close) => (
      <div>
        <button onClick={() => close(true)}>Confirm</button>
        <button onClick={() => close(false)}>Cancel</button>
      </div>
    ),
  });

  return result;
}
```

## Top-Layer Transport

Inline transport is the default because it gives the package tighter control over animation and backdrop behavior.

When you want native top-layer rendering, use:

```tsx
await display({
  id: 'settings-dialog',
  transport: 'top-layer',
  render: (close) => <SettingsDialog onClose={() => close()} />,
});
```

This path uses the native `<dialog>` element under the hood.

## Accessibility

Always give modal content an accessible name. The preferred pattern is to render a visible heading and connect it with `ariaLabelledBy`; add `ariaDescribedBy` when helper text explains the consequence of the action.

```tsx
await display({
  id: 'delete-confirm',
  ariaLabelledBy: 'delete-confirm-title',
  ariaDescribedBy: 'delete-confirm-description',
  render: (close) => (
    <section>
      <h2 id="delete-confirm-title">Delete item?</h2>
      <p id="delete-confirm-description">This action cannot be undone.</p>
      <button onClick={() => close(false)}>Cancel</button>
      <button onClick={() => close(true)}>Delete</button>
    </section>
  ),
});
```

For dialogs without a visible title, use `ariaLabel`. Use `role: 'alertdialog'` only for urgent confirmation flows that require immediate attention.

### React Compiler note

The `render` callback must stay pure. Do not call hooks, create nested components, mutate captured values, or run side effects directly inside it. If the modal body needs hooks, return a real component and pass `close` as a prop.

```tsx
// Good: hooks live inside SettingsDialog, not inside the render callback.
await display({
  ariaLabel: 'Settings',
  render: (close) => <SettingsDialog onClose={() => close()} />,
});

// Avoid: hooks inside render callbacks violate the Rules of Hooks.
await display({
  ariaLabel: 'Settings',
  render: (close) => {
    // const value = useSomething(); // Do not do this.
    return <SettingsDialog onClose={() => close()} />;
  },
});
```

## Positioning

Supported `position` values:

- `center`
- `top`
- `bottom`
- `left`
- `right`
- `top-left`
- `top-right`
- `bottom-left`
- `bottom-right`

## Motion Model

`@ilokesto/modal` uses the overlay `closing` state instead of removing immediately.

- open → fade in + scale in
- close → fade out + scale out
- remove → after exit animation completes
- reduced motion → removal is fast-tracked instead of waiting for animation

That means awaited results resolve after the modal is actually removed, not at the first close request.

## Source Layout

```text
src/
  adapters/
    ModalAdapter.tsx
    ModalAdapterInline.tsx
    ModalAdapterTopLayer.tsx
  components/
    ModalProvider.tsx
  facade/
    modalFacade.ts
  hooks/
    useModal.ts
  shared/
    styles.ts
    types.ts
  index.ts
```

## Responsibilities

### `src/adapters`

- `ModalAdapter.tsx` → selects inline vs top-layer transport
- `ModalAdapterInline.tsx` → inline modal path with backdrop, scroll lock, focus handling, dismiss behavior, positioning, and animation
- `ModalAdapterTopLayer.tsx` → native `<dialog>` path with dialog cancel/backdrop handling, positioning, scoped backdrop styling, and animation

### `src/components`

- `ModalProvider.tsx` → wraps `OverlayProvider`, registers the modal adapter, injects shared modal CSS, and defaults to the global modal store

### `src/facade`

- `modalFacade.ts` → exports `modal` and `globalModalStore` for module-level usage

### `src/hooks`

- `useModal.ts` → React command API for `display` and `clear`

### `src/shared`

- `styles.ts` → shared fade/scale animation styles
- `types.ts` → modal props, scoped render callback, adapter props, and position contracts

### `src/index.ts`

- re-exports the public provider, hook, facade, and types

## Exports

- values → `ModalProvider`, `useModal`, `modal`, `globalModalStore`
- types → `ModalProviderProps`, `UseModalOptions`, `ModalFacadeOptions`, `ModalProps`, `ModalAdapterProps`, `ModalPosition`, `ModalClose`, `ModalRender`, `ModalRenderContext`

## Development

```bash
pnpm install
pnpm run build
```

Build outputs are generated in the `dist` directory.

## License

MIT
