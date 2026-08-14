# @ilokesto/overlay

[English](./README.md) | **한국어**

`@ilokesto/store` 위에 얹는 작은 React overlay runtime입니다.

이 패키지는 provider-scoped overlay core, built-in host, item lifecycle 관리, adapter 주입 구조를 제공합니다. modal이나 toast 의미론은 의도적으로 코어에 넣지 않아서, 상위 패키지가 같은 runtime 위에서 자신만의 동작을 구현할 수 있게 되어 있습니다.

## Features

- **Provider-scoped runtime** — 전역 싱글턴이 아닌 provider 단위 store
- **격리 컨텍스트** — `createOverlayContext()`로 여러 개의 독립된 overlay 스택 생성
- **Promise 기반 비동기 overlay** — `display()`가 exit 애니메이션 완료 후 resolve되는 Promise 반환
- **2단계 dismiss** — `close()`가 애니메이션 트리거, `remove()`가 실제 언마운트
- **reject 지원** — `reject(id, reason)`으로 에러 흐름에서 Promise 거부
- **일괄 닫기** — `closeAll()`이 모든 overlay를 `closing`으로 전환하여 일괄 exit 애니메이션
- **어댑터 라이프사이클 훅** — `useLifecycle`으로 `onOpen`, `onClosing`, `onUnmount` 선언적 등록
- **어댑터 플러그인** — Provider 단위 공통 정책 (로깅, 분석, 접근성)
- **ID 중복 가드** — `open({ id })`는 멱등; dangling Promise 없음
- **단일 아이템 구독** — `useOverlayItem(id)` with `Object.is` bailout
- **Provider 마운트 전 open 가능** — `store.open()`이 Provider 없이도 동작

## 목차

- [설치](#설치)
- [기본 사용법](#기본-사용법)
- [Promise 기반 Overlay](#promise-기반-overlay)
- [2단계 Dismiss Lifecycle](#2단계-dismiss-lifecycle)
- [Overlay 거부하기](#overlay-거부하기)
- [모든 Overlay 닫기](#모든-overlay-닫기)
- [Overlay ID와 중복 가드](#overlay-id와-중복-가드)
- [Provider 마운트 전 Overlay 열기](#provider-마운트-전-overlay-열기)
- [격리된 Overlay Context](#격리된-overlay-context)
- [Adapter Lifecycle Hooks](#adapter-lifecycle-hooks)
- [Adapter Plugins](#adapter-plugins)
- [API 레퍼런스](#api-레퍼런스)
- [소스 구조](#소스-구조)
- [개발](#개발)
- [라이선스](#라이선스)

## 설치

```bash
pnpm add @ilokesto/overlay react
```

또는

```bash
npm install @ilokesto/overlay react
```

## 기본 사용법

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

    console.log(result); // true 또는 undefined
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

## Promise 기반 Overlay

`display()`는 overlay가 완전히 제거된 후(exit 애니메이션 완료 후) resolve되는 `Promise<TResult | undefined>`를 반환합니다:

```tsx
const confirmed = await display<boolean>({ type: 'modal', props: { ... } });
// confirmed === true  → 사용자가 confirm 클릭
// confirmed === false → 사용자가 cancel 클릭
// confirmed === undefined → close 없이 remove됨
```

fire-and-forget 사용 시 `open()`을 사용하면 `id`만 반환합니다:

```tsx
const id = open({ type: 'toast', props: { message: 'Hello' } });
```

## 2단계 Dismiss Lifecycle

dismiss lifecycle은 2단계로 구성되어 있어, 어댑터가 exit 애니메이션 타이밍을 완전히 제어합니다:

| 단계 | 함수 | 동작 |
|---|---|---|
| 1 | `close(id, result)` | status가 `closing`으로 전환. `isOpen`이 `false`로 변경. 어댑터가 exit 애니메이션 재생. |
| 2 | `remove(id)` | 아이템이 store에서 제거. Promise가 `closeResult`로 resolve. |

어댑터는 `close`와 `remove`를 prop으로 받습니다. `close()`로 애니메이션을 트리거하고, 애니메이션 종료 시 `remove()`를 호출합니다:

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

## Overlay 거부하기

`reject(id, reason)`은 overlay를 `closing`으로 전환하지만 (`close`와 동일), 어댑터가 이후 `remove(id)`를 호출할 때 `display()` Promise가 resolve되는 대신 reason과 함께 **reject** 됩니다.

overlay가 실패할 수 있는 흐름을 나타낼 때 유용합니다. 예를 들어 타임아웃으로 취소된 로그인 다이얼로그:

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

2단계 dismiss lifecycle은 유지됩니다: `reject`는 상태를 `closing`으로만 전환하고, 어댑터가 exit 애니메이션을 재생한 후 `remove(id)`를 호출할 때 Promise가 실제로 reject 됩니다.

## 모든 Overlay 닫기

`closeAll()`은 모든 open overlay를 한 번에 `closing` 상태로 전환합니다. `clear()`와 달리 아이템을 store에서 제거하거나 Promise를 해소하지 않습니다 — 어댑터가 각 overlay의 언마운트 시점을 여전히 제어합니다.

| | `closeAll()` | `clear()` |
|---|---|---|
| 상태 | 모든 `open` → `closing` | 아이템 즉시 제거 |
| store 아이템 | 유지 | 비워짐 |
| Promise | 대기 (`remove` 시 해소) | 즉시 해소 |
| 사용 시나리오 | 일괄 exit 애니메이션 | 긴급 정리 |

```tsx
function CloseAllButton() {
  const { closeAll } = useOverlay();
  return <button onClick={closeAll}>모두 닫기</button>;
}
```

## Overlay ID와 중복 가드

`open()`에 명시적 `id`를 전달하면 store가 중복을 방지합니다:

- 같은 `id`의 overlay가 이미 open(또는 closing) 상태면, `open()`은 **기존** `OverlayRequest`를 반환합니다 — 같은 `id`와 같은 `Promise`.
- store에 두 번째 아이템이 추가되지 않습니다.
- `Promise`가 복제되지 않으므로 dangling promise가 발생하지 않습니다.

즉 `open({ id, ... })`는 멱등입니다 — overlay가 활성 상태일 때 같은 `id`로 여러 번 호출해도 부작용이 없습니다.

overlay가 remove(또는 clear)되면 `id`가 해제되어 새 overlay에 재사용할 수 있습니다.

## Provider 마운트 전 Overlay 열기

`store.open()`은 `OverlayProvider`가 마운트되기 전에 호출할 수 있습니다 — 아이템은 즉시 store에 저장되고, `useSyncExternalStore`가 Provider의 첫 렌더에서 이를 가져옵니다. 이벤트 이미터가 필요하지 않습니다:

```tsx
const store = createOverlayStore();

// Provider가 존재하기 전에 호출
store.open({ id: 'early', type: 'modal' });

// 나중에 — 첫 마운트 시 아이템이 렌더됩니다
<OverlayProvider adapters={adapters} store={store}>
  <App />
</OverlayProvider>
```

## 격리된 Overlay Context

기본적으로 `OverlayProvider`, `useOverlay`, `useOverlayItems`, `useOverlayItem`은 하나의 React context를 공유합니다. 여러 개의 독립된 overlay 스택이 필요하면 (예: 메인 앱과 임베드된 위젯) `createOverlayContext()`를 사용하세요:

```tsx
import { createOverlayContext } from '@ilokesto/overlay';

const mainOverlay = createOverlayContext();
const widgetOverlay = createOverlayContext();

// 각 context는 자체 Provider, store, hooks를 가지며 완전히 격리됩니다.
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

각 context 인스턴스는 다음을 제공합니다:
- `Provider` — built-in `OverlayHost`가 포함된 context provider
- `useOverlay` — 명령형 API (open, close, closeAll, reject, remove, clear)
- `useOverlayItems` — 전체 아이템 목록 구독
- `useOverlayItem(id)` — 단일 아이템 구독

기본 export (`OverlayProvider`, `useOverlay` 등)는 하위 호환을 위해 `createOverlayContext()`로 미리 생성한 인스턴스입니다.

## Adapter Lifecycle Hooks

Adapter는 `OverlayRenderProps`에서 제공하는 `useLifecycle` prop으로 사이드이펙트 콜백을 등록할 수 있습니다:

```tsx
const modalAdapter: OverlayAdapterComponent = ({ useLifecycle, isOpen, close }) => {
  useLifecycle({
    onOpen: (id) => { document.body.style.overflow = 'hidden'; },
    onClosing: (id) => { /* status가 "closing"으로 전환됨 */ },
    onUnmount: (id) => { document.body.style.overflow = ''; },
  });

  if (!isOpen) return null;
  return <div role="dialog">...</div>;
};
```

Host는 상태 전환에 따라 훅을 호출합니다:

| 훅 | 호출 시점 | 보장 |
|---|---|---|
| `onOpen(id, item)` | `status: "open"`으로 첫 마운트 | open당 1회 |
| `onClosing(id, item)` | `open → closing` 전환 | close당 1회 |
| `onUnmount(id)` | 컴포넌트 언마운트 (`remove` 후) | lifecycle당 1회 |

Adapter가 `useLifecycle`을 호출하지 않으면 훅이 발생하지 않습니다 — opt-in 동작입니다.

## Adapter Plugins

플러그인은 각 어댑터를 개별적으로 수정하지 않고 Provider 단위의 공통 정책(로깅, 분석, 기본 접근성 동작 등)을 제공합니다:

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

### 우선순위 규칙

- 어댑터가 `useLifecycle`으로 특정 phase의 훅을 등록하면 **어댑터 훅이 우선** — 해당 phase에서 플러그인은 건너뜁니다.
- 어댑터가 특정 phase의 훅을 등록하지 않으면 **모든 플러그인이 등록 순서대로 실행**됩니다.

즉, 어댑터가 특정 phase만 오버라이드(예: 커스텀 포커스 트랩)하고 나머지는 플러그인이 처리(예: 로깅)할 수 있습니다.

## API 레퍼런스

### `createOverlayStore()`

Provider 단위 overlay store를 생성합니다. `open`, `close`, `closeAll`, `reject`, `remove`, `clear`, `subscribe`, `getSnapshot`, `getInitialSnapshot`을 가진 `OverlayStoreApi`를 반환합니다.

### `createOverlayContext()`

격리된 React context를 생성합니다. `{ Provider, useOverlay, useOverlayItems, useOverlayItem }`을 반환합니다.

### `OverlayProvider`

built-in `OverlayHost`가 포함된 context provider. Props: `adapters`, `children`, `store?`, `plugins?`.

### `useOverlay()`

`{ display, open, close, closeAll, reject, remove, clear }`를 반환합니다.

### `useOverlayItems()`

`ReadonlyArray<OverlayItem>` — 현재 overlay 아이템 목록을 반환합니다.

### `useOverlayItem(id)`

`OverlayItem | undefined` — 특정 id의 아이템을 `Object.is` bailout으로 구독합니다.

### 타입

- `OverlayStoreApi`, `OverlayProviderProps`, `OverlayItem`, `OverlayRequest`, `DisplayOptions`, `OverlayId`, `OverlayStatus`, `OverlayState`
- `OverlayAdapterComponent`, `OverlayAdapterMap`, `OverlayRenderProps`, `OverlayAdapterHooks`
- `OverlayPlugin`
- `OverlayContextInstance`, `OverlayContextValue`
- `UseOverlayReturn`

## 소스 구조

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

### 책임 분리

**`src/core`** — runtime 구현:
- `createOverlayStore.ts` — `open`, `close`, `closeAll`, `reject`, `remove`, `clear` 수명주기 관리
- `createOverlayContext.tsx` — 격리된 React context 생성 팩토리
- `OverlayProvider.tsx` — 기본 context 인스턴스 re-export (하위 호환)
- `OverlayHost.tsx` — 어댑터로 아이템 렌더링, 상태 전환 시 lifecycle 훅 호출
- `useOverlay.ts` — 명령형 API 훅
- `useOverlayItems.ts` / `useOverlayItem.ts` — `useSyncExternalStore` 기반 구독 훅

**`src/contracts`** — 공용 타입:
- `adapter.ts` — `OverlayRenderProps`, `OverlayAdapterComponent`, `OverlayAdapterMap`, `OverlayAdapterHooks`
- `overlay.ts` — `OverlayItem`, `OverlayStoreApi`, `DisplayOptions`, `OverlayProviderProps`
- `plugin.ts` — `OverlayPlugin`

### 의존성 방향

- `core/*` 는 `contracts/*` 에 의존합니다
- `contracts/overlay.ts` 는 `contracts/adapter.ts` 에 의존합니다
- `contracts/adapter.ts` 는 runtime 코드에 의존하지 않습니다
- modal이나 toast 같은 adapter 패키지는 `@ilokesto/overlay` 에 의존해야 합니다
- `@ilokesto/overlay` 는 modal/toast 구현을 직접 import하면 안 됩니다

코어는 lifecycle과 hosting을 담당하고, adapter 패키지는 의미론과 표현을 담당합니다.

## 개발

```bash
pnpm install
pnpm run build
pnpm test
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다. 테스트는 Vitest와 @testing-library/react로 실행됩니다.

## 라이선스

MIT