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

## Source Layout

```text
src/
  core/
    createOverlayStore.ts
    OverlayProvider.tsx
    OverlayHost.tsx
    useOverlay.ts
    useOverlayItems.ts
  contracts/
    adapter.ts
    overlay.ts
  index.ts
```

## Responsibilities

### `src/core`

- `createOverlayStore.ts` → provider 단위 overlay store를 만들고 `open`, `close`, `remove`, `clear` 수명주기를 관리합니다
- `OverlayProvider.tsx` → store를 만들거나 주입받아 context로 노출하고 built-in `OverlayHost`를 마운트합니다
- `OverlayHost.tsx` → 현재 overlay item 목록을 읽고 각 item을 `adapters[item.type]`에 위임해 렌더링합니다
- `useOverlay.ts` → overlay를 열고 닫고 제거하는 명령형 API를 제공합니다
- `useOverlayItems.ts` → `useSyncExternalStore`로 현재 overlay item 목록을 구독합니다

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

## Exports

- `@ilokesto/overlay` → `createOverlayStore`, `OverlayProvider`, `OverlayHost`, `useOverlay`, `useOverlayItems`
- `@ilokesto/overlay` 타입 → `src/contracts/adapter.ts`, `src/contracts/overlay.ts`, `UseOverlayReturn`에서 다시 export된 타입

## Development

```bash
pnpm install
pnpm run build
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다.

## License

MIT
