# @ilokesto/toast

[English](./README.md) | **한국어**

실사용 기준으로 `react-hot-toast`를 대체할 수 있도록 만든 React toast 패키지입니다.

`@ilokesto/toast`는 provider-scoped toast runtime, 익숙한 `toast.*` facade, 기본 렌더러, headless hook, 그리고 선택적인 top-layer transport를 제공합니다. 내부적으로는 `@ilokesto/overlay`를 presence lifecycle 용도로만 사용하고, toast 정책과 렌더링은 이 패키지 안에서 처리합니다.

## Features

- 익숙한 facade: `toast()`, `toast.success()`, `toast.error()`, `toast.loading()`, `toast.custom()`, `toast.promise()`
- `toasterId` 기준으로 분리되는 provider-scoped runtime
- 기본 `Toaster`에 포함된 카드 UI, 상태 아이콘, spinner, enter/exit motion
- `style`, `className`, `icon`, `iconTheme`, `removeDelay`, `position`, `duration`, `ariaProps` 같은 per-toast 옵션
- global → per-type → per-toast 순서의 `toastOptions` merge
- 커스텀 렌더러를 위한 headless `useToaster()`
- manual popover 기반의 선택적 `transport="top-layer"`

## Installation

```bash
pnpm add @ilokesto/toast react react-dom
```

또는

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

`@ilokesto/toast`는 `react-hot-toast`에 없는 추가 렌더링 모드를 제공합니다.

```tsx
<Toaster transport="top-layer" />
```

브라우저가 지원하면 manual popover를 사용하고, 지원하지 않으면 inline 렌더링으로 자동 fallback합니다.

## Headless Usage

`useToaster()`는 visible toast 목록과 runtime helper를 노출합니다.

```ts
const { toasts, handlers } = useToaster();
```

사용 가능한 handler:

- `updateHeight`
- `startPause`
- `endPause`
- `calculateOffset`

이 hook은 mounted `Toaster` context 아래에서 동작하는 고급 통합 시나리오를 위한 API입니다.

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

- `Toaster.tsx` → visible toast stack을 마운트하고 runtime view 옵션을 설정하며 기본 컨테이너를 제공합니다
- `ToastBar.tsx` → 개별 toast row를 위한 기본 렌더러 primitive입니다
- `icons.tsx` → 기본 spinner와 상태 아이콘 컴포넌트를 제공합니다
- `ToastProvider.tsx` → `toasterId`별 provider-scoped runtime을 만들고 등록합니다

### `src/core`

- `toast.ts` → public `toast.*` facade
- `createToastRuntime.ts` → id, timer, promise transition, dismiss/remove, visible-set 계산을 담당하는 toast policy 레이어
- `createToastStore.ts` → raw toast state store
- `registry.ts` → `toasterId` 기준 runtime 등록
- `utils.ts` → 기본 duration, id, icon theme, helper 정의

### `src/hooks`

- `useToaster.ts` → `{ toasts, handlers }`를 반환하는 headless hook
- `useToastItems.ts` → 현재 visible toast item 목록을 구독합니다

### `src/types`

- `toast.ts` → runtime API, props, item state, options에 대한 public contract

### `src/index.ts`

- public runtime, renderer, hook, type surface를 다시 export합니다

## Exports

- values → `toast`, `Toaster`, `ToastBar`, `ToastIcon`, `useToaster`, `useToastItems`, `createToastRuntime`
- types → `ToastBarProps`, `ToastOptions`, `DefaultToastOptions`, `ToasterProps`, `UseToasterResult` 등 toast 관련 public 타입

## Migration

`react-hot-toast`에서 옮겨오는 경우 [MIGRATION_FROM_REACT_HOT_TOAST.ko.md](./MIGRATION_FROM_REACT_HOT_TOAST.ko.md)를 참고하세요.

## Development

```bash
pnpm install
pnpm run build
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다.

## License

MIT
