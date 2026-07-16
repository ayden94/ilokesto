# @ilokesto/overlay

[English](./README.md) | **한국어**

`@ilokesto/store` 위에 얹는 작은 React overlay runtime입니다.

이 패키지는 provider-scoped overlay core, built-in host, item lifecycle 관리, adapter 주입 구조를 제공합니다. modal이나 toast 의미론은 의도적으로 코어에 넣지 않아서, 상위 패키지가 같은 runtime 위에서 자신만의 동작을 구현할 수 있게 되어 있습니다.

## Features

- 전역 싱글턴이 아닌 provider-scoped overlay runtime
- adapter registry를 통해 overlay item을 렌더링하는 built-in host
- 같은 store lifecycle 위에서 동기/비동기 overlay 열기 지원
- runtime core와 공용 contract의 명확한 분리
- overlay를 열고 닫고 제거하고 관찰하는 작은 공개 API

## Installation

```bash
pnpm add @ilokesto/overlay react
```

또는

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

## Overlay ID와 중복 가드

`open()`에 명시적 `id`를 전달하면 store가 중복을 방지합니다:

- 같은 `id`의 overlay가 이미 open(또는 closing) 상태면, `open()`은 **기존** `OverlayRequest`를 반환합니다 — 같은 `id`와 같은 `Promise`.
- store에 두 번째 아이템이 추가되지 않습니다.
- `Promise`가 복제되지 않으므로 dangling promise가 발생하지 않습니다.

즉 `open({ id, ... })`는 멱등입니다 — overlay가 활성 상태일 때 같은 `id`로 여러 번 호출해도 부작용이 없습니다.

overlay가 remove(또는 clear)되면 `id`가 해제되어 새 overlay에 재사용할 수 있습니다.

## Overlay 거부하기

`reject(id, reason)`은 overlay를 `closing` 상태로 전환합니다(`close`와 동일). 하지만 어댑터가 이후 `remove(id)`를 호출할 때 `display()` Promise가 resolve되는 대신 reason과 함께 **reject** 됩니다.

overlay가 실패할 수 있는 흐름을 나타낼 때 유용합니다. 예를 들어 타임아웃으로 취소된 로그인 다이얼로그:

```tsx
function LoginButton() {
  const { open, reject, remove } = useOverlay();

  const handleLogin = () => {
    const id = open({ type: 'modal', props: { title: 'Sign in' } });

    // 타임아웃으로 overlay를 거부하는 시뮬레이션
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

- `createOverlayStore.ts` → provider 단위 overlay store를 만들고 `open`, `close`, `closeAll`, `reject`, `remove`, `clear` 수명주기를 관리합니다
- `createOverlayContext.tsx` → 격리된 React context를 생성하는 팩토리. 자체 Provider, useOverlay, useOverlayItems, useOverlayItem을 반환합니다
- `OverlayProvider.tsx` → 하위 호환을 위해 기본 context 인스턴스(Provider + hooks)를 re-export합니다
- `OverlayHost.tsx` → 현재 overlay item 목록을 읽고 각 item을 `adapters[item.type]`에 위임해 렌더링합니다
- `useOverlay.ts` → overlay를 열고 닫고 거부하고 제거하는 명령형 API를 제공합니다
- `useOverlayItems.ts` → `useSyncExternalStore`로 현재 overlay item 목록을 구독합니다
- `useOverlayItem.ts` → `useSyncExternalStore`로 단일 overlay item을 id로 구독합니다

### `src/contracts`

- `adapter.ts` → `OverlayRenderProps`, `OverlayAdapterComponent`, `OverlayAdapterMap` 같은 adapter 렌더링 계약을 정의합니다
- `overlay.ts` → `OverlayItem`, `OverlayStoreApi`, `DisplayOptions`, `OverlayProviderProps` 같은 overlay runtime 계약을 정의합니다

### `src/index.ts`

- `core/*`의 runtime API를 다시 export합니다
- `contracts/*`의 공용 타입을 다시 export합니다

## Dependency Direction

- `core/*` 는 `contracts/*` 에 의존합니다
- `contracts/overlay.ts` 는 `contracts/adapter.ts` 에 의존합니다
- `contracts/adapter.ts` 는 runtime 코드에 의존하지 않습니다
- modal이나 toast 같은 adapter 패키지는 `@ilokesto/overlay` 에 의존해야 합니다
- `@ilokesto/overlay` 는 modal/toast 구현을 직접 import하면 안 됩니다

한 줄로 말하면, 코어는 lifecycle과 hosting을 담당하고 adapter 패키지는 의미론과 표현을 담당합니다.

## Adapter Packages

이 패키지는 의도적으로 generic하게 설계되어 있습니다.

- modal 패키지는 overlay runtime 위에 modal adapter를 주입해서 사용할 수 있습니다
- toast 패키지도 같은 runtime 위에 toast adapter를 주입해서 사용할 수 있습니다
- focus trap, scroll lock, backdrop 동작, deduplication, timer, animation 같은 정책은 overlay core가 아니라 adapter 레이어에 있어야 합니다

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

## Exports

- `@ilokesto/overlay` → `createOverlayStore`, `createOverlayContext`, `OverlayProvider`, `OverlayHost`, `useOverlay`, `useOverlayItems`, `useOverlayItem`
- `@ilokesto/overlay` 타입 → `src/contracts/adapter.ts`, `src/contracts/overlay.ts`, `UseOverlayReturn`, `OverlayContextInstance`, `OverlayContextValue`에서 다시 export된 타입

## Development

```bash
pnpm install
pnpm run build
pnpm test
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다. 테스트는 Vitest와 @testing-library/react로 실행됩니다.

## License

MIT
