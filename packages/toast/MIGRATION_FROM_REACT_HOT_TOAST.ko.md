# `react-hot-toast`에서 `@ilokesto/toast`로 마이그레이션하기

이 문서는 이미 `react-hot-toast`를 쓰고 있는 팀이 큰 부담 없이 `@ilokesto/toast`로 옮길 수 있도록 정리한 가이드입니다.

`@ilokesto/toast`는 `toast.success()`, `toast.error()`, `toast.loading()`, `toast.custom()`, `toast.promise()`, `Toaster`, `toastOptions`, headless rendering 같은 일반적인 사용 경로에서 익숙하게 느껴지도록 설계되어 있습니다. 완전히 똑같은 구현은 아니지만, 실사용 마이그레이션에는 충분히 가깝습니다.

## 1. 패키지 설치

```bash
pnpm add @ilokesto/toast
```

또는

```bash
npm install @ilokesto/toast
```

## 2. import 교체

### Before

```tsx
import { Toaster, toast } from 'react-hot-toast';
```

### After

```tsx
import { Toaster, toast } from '@ilokesto/toast';
```

## 3. 기본 마운트 패턴은 거의 같습니다

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

## 4. facade 호출은 그대로 가져가면 됩니다

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

## 5. Promise toast도 비슷하게 유지됩니다

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

추가로 `@ilokesto/toast`는 `Promise<T>`뿐 아니라 `() => Promise<T>`도 받을 수 있습니다.

## 6. `toastOptions`도 거의 같은 방식으로 옮길 수 있습니다

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

`@ilokesto/toast`는 다음 순서로 옵션을 합칩니다.

1. global `toastOptions`
2. per-type `toastOptions.success/error/loading/blank/custom`
3. 개별 `toast()` 호출 옵션

## 7. 그대로 옮길 수 있는 per-toast 옵션

다음 옵션은 그대로 사용할 수 있습니다.

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

예시:

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

## 8. `dismiss()`와 `remove()`

`@ilokesto/toast`도 soft/hard removal 개념을 유지합니다.

- `toast.dismiss(id?)` → soft close, exit animation 시간을 남겨둠
- `toast.remove(id?)` → 즉시 hard removal

`id`를 생략하면 해당 runtime의 모든 visible toast에 적용됩니다. 즉, 실사용 관점에서는 별도 `dismissAll` / `removeAll` 메서드 없이도 같은 역할을 할 수 있습니다.

## 9. 여러 toaster는 `toasterId`로 분리됩니다

```tsx
<>
  <Toaster toasterId="app" position="top-right" />
  <Toaster toasterId="editor" position="bottom-center" />
</>

toast.success('Saved', { toasterId: 'editor' });
```

각 `toasterId`는 독립적인 provider-scoped runtime을 가집니다.

## 10. Headless rendering은 약간 다릅니다

`react-hot-toast`에서 headless path를 쓰고 있었다면 개념은 비슷하지만 반환 형태가 더 명시적입니다.

```tsx
const { toasts, handlers } = useToaster();
```

사용 가능한 handler:

- `updateHeight`
- `startPause`
- `endPause`
- `calculateOffset`

차이점은 `useToaster()`가 마운트된 `Toaster` context 아래에서 쓰이는 걸 전제로 한다는 점입니다.

## 11. `ToastBar`가 public primitive입니다

`react-hot-toast`에서 custom row wrapper를 쓰고 있었다면 여기서는 `ToastBar`가 가장 가까운 primitive입니다.

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

## 12. 추가 기능: top-layer transport

이건 `react-hot-toast` 표준 API에는 없는 기능입니다.

```tsx
<Toaster transport="top-layer" />
```

선택적으로 켤 수 있고, 브라우저가 지원하면 manual popover를 사용합니다.

## 13. 실사용 관점에서 기억할 차이

- byte-for-byte clone은 아닙니다
- `dismissAll()` / `removeAll()`라는 이름의 별도 facade 메서드는 없습니다. 대신 `dismiss()` / `remove()`를 id 없이 호출하면 됩니다
- `useToaster()`는 mounted `Toaster` context 아래에서 쓰는 방식입니다
- `transport="top-layer"`는 추가 기능입니다

## 14. 최소 마이그레이션 체크리스트

- import를 교체한다
- 기존 `toast.*` 호출을 유지한다
- `<Toaster />`를 마운트한다
- 기존 `toastOptions`를 옮긴다
- 고급 row customization은 `Toaster` children과 `ToastBar` 기준으로 옮긴다
- global headless access에 의존했다면 `useToaster()`를 mounted `Toaster` 아래로 이동한다

이 정도면 대부분의 애플리케이션은 큰 동작 변경 없이 옮길 수 있습니다.
