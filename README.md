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

Because modal content usually needs to close itself with a result, the most practical pattern is to use a stable `id` and call `close(id, result)` from your content callbacks.

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
  const { display, close } = useModal();

  const handleClick = async () => {
    const modalId = 'delete-confirm';

    const confirmed = await display<boolean>({
      id: modalId,
      position: 'center',
      dismissible: true,
      children: (
        <ConfirmContent
          onConfirm={() => close(modalId, true)}
          onCancel={() => close(modalId, false)}
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
    children: (
      <div>
        <button onClick={() => modal.close(modalId, true)}>Confirm</button>
        <button onClick={() => modal.close(modalId, false)}>Cancel</button>
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
  children: <SettingsDialog />,
});
```

This path uses the native `<dialog>` element under the hood.

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

- `useModal.ts` → React command API for `open`, `display`, `close`, `remove`, and `clear`

### `src/shared`

- `styles.ts` → shared fade/scale animation styles
- `types.ts` → modal props, adapter props, and position contracts

### `src/index.ts`

- re-exports the public provider, hook, facade, and types

## Exports

- values → `ModalProvider`, `useModal`, `modal`, `globalModalStore`
- types → `ModalProviderProps`, `UseModalOptions`, `ModalFacadeOptions`, `ModalProps`, `ModalAdapterProps`, `ModalPosition`

## Development

```bash
pnpm install
pnpm run build
```

Build outputs are generated in the `dist` directory.

## License

MIT
