# Migrating from `react-hot-toast` to `@ilokesto/toast`

This guide is for teams already using `react-hot-toast` who want to move to `@ilokesto/toast` with minimal mental overhead.

`@ilokesto/toast` is designed to feel familiar for the common path: `toast.success()`, `toast.error()`, `toast.loading()`, `toast.custom()`, `toast.promise()`, `Toaster`, `toastOptions`, and headless rendering are all available. It is not a byte-for-byte clone, but it is close enough for a practical swap.

## 1. Install the package

```bash
pnpm add @ilokesto/toast
```

or

```bash
npm install @ilokesto/toast
```

## 2. Replace imports

### Before

```tsx
import { Toaster, toast } from 'react-hot-toast';
```

### After

```tsx
import { Toaster, toast } from '@ilokesto/toast';
```

## 3. Keep the same basic mount pattern

### Before

```tsx
import { Toaster } from 'react-hot-toast';

export function App() {
  return <Toaster />;
}
```

### After

```tsx
import { Toaster } from '@ilokesto/toast';

export function App() {
  return <Toaster />;
}
```

## 4. Facade calls map directly

### Before

```tsx
toast('Hello');
toast.success('Saved');
toast.error('Failed');
toast.loading('Saving...');
toast.custom(<div>Custom</div>);
```

### After

```tsx
toast('Hello');
toast.success('Saved');
toast.error('Failed');
toast.loading('Saving...');
toast.custom(<div>Custom</div>);
```

## 5. Promise toasts stay familiar

### Before

```tsx
toast.promise(savePost(), {
  loading: 'Saving...',
  success: 'Saved',
  error: 'Failed',
});
```

### After

```tsx
toast.promise(savePost(), {
  loading: 'Saving...',
  success: 'Saved',
  error: 'Failed',
});
```

`@ilokesto/toast` also accepts `() => Promise<T>` in addition to `Promise<T>`.

## 6. `toastOptions` maps closely

### Before

```tsx
<Toaster
  position="top-right"
  reverseOrder={false}
  gutter={8}
  containerStyle={{ top: 16 }}
  toastOptions={{
    duration: 4000,
    success: {
      duration: 2000,
    },
  }}
/>
```

### After

```tsx
<Toaster
  position="top-right"
  reverseOrder={false}
  gutter={8}
  containerStyle={{ top: 16 }}
  toastOptions={{
    duration: 4000,
    success: {
      duration: 2000,
    },
  }}
/>
```

`@ilokesto/toast` resolves options in this order:

1. global `toastOptions`
2. per-type `toastOptions.success/error/loading/blank/custom`
3. per-toast call options

## 7. Per-toast options you can keep using

These map directly onto `@ilokesto/toast`:

- `id`
- `toasterId`
- `duration`
- `position`
- `ariaProps`
- `style`
- `className`
- `icon`
- `iconTheme`
- `removeDelay`

Example:

```tsx
toast.success('Saved', {
  style: { background: '#111827', color: '#fff' },
  className: 'my-toast',
  iconTheme: {
    primary: '#22c55e',
    secondary: '#ffffff',
  },
  removeDelay: 1200,
});
```

## 8. `dismiss()` and `remove()`

`@ilokesto/toast` keeps the same soft-vs-hard removal idea:

- `toast.dismiss(id?)` → soft close, keeps exit time for animation
- `toast.remove(id?)` → immediate hard removal

If you omit the `id`, the action applies to all visible toasts for that runtime. In practice, that covers the common `dismissAll` / `removeAll` use case without separate method names.

## 9. Multiple toasters still work through `toasterId`

```tsx
<>
  <Toaster toasterId="app" position="top-right" />
  <Toaster toasterId="editor" position="bottom-center" />
</>

toast.success('Saved', { toasterId: 'editor' });
```

Each `toasterId` gets its own provider-scoped runtime.

## 10. Headless rendering changes slightly

If you used the headless path in `react-hot-toast`, the mental model is similar, but the return shape is explicit:

```tsx
const { toasts, handlers } = useToaster();
```

Available handlers:

- `updateHeight`
- `startPause`
- `endPause`
- `calculateOffset`

Unlike a global hook model, `useToaster()` is expected to run under a mounted `Toaster` context.

## 11. `ToastBar` is public

If you used custom row wrappers in `react-hot-toast`, `ToastBar` is the closest primitive here.

```tsx
<Toaster>
  {(toast) => (
    <ToastBar toast={toast}>
      {({ icon, message }) => (
        <>
          {icon}
          <strong>{message}</strong>
        </>
      )}
    </ToastBar>
  )}
</Toaster>
```

## 12. Extra capability: top-layer transport

`react-hot-toast` does not ship this as part of its standard API. `@ilokesto/toast` adds:

```tsx
<Toaster transport="top-layer" />
```

This is opt-in and uses manual popover when supported.

## 13. Practical differences to keep in mind

- The package is a practical replacement, not a byte-for-byte clone.
- `dismissAll()` / `removeAll()` are not separate named facade methods; use `dismiss()` / `remove()` without an `id`.
- `useToaster()` is designed around a mounted `Toaster` context.
- `transport="top-layer"` is an additive capability.

## 14. Minimal migration checklist

- Replace imports
- Keep your existing `toast.*` calls
- Mount `<Toaster />`
- Move your existing `toastOptions` over
- Replace advanced row customization with `Toaster` children and `ToastBar` where needed
- If you relied on global headless access, move `useToaster()` under a mounted `Toaster`

After that, most applications should be able to continue with little or no behavioral rewrite.
