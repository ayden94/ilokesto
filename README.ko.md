# @ilokesto/modal

[English](./README.md) | **한국어**

Grunfeld의 awaitable dialog 철학을 유지하면서, 기본 motion을 더 부드럽게 만든 `@ilokesto/overlay` 기반 React modal 패키지입니다.

`@ilokesto/modal`은 modal 정책을 패키지 내부에 둡니다. dismiss 규칙, focus 처리, scroll lock, inline / top-layer transport, backdrop 동작, enter/exit animation은 이 패키지에서 담당하고, `@ilokesto/overlay`는 presence lifecycle만 맡습니다. 그래서 modal은 닫히는 동안에도 잠깐 살아 있으면서 exit motion을 끝낸 뒤 resolve될 수 있습니다.

## Features

- `display()`를 통한 awaitable modal flow
- `useModal()` 기반 hook API
- `modal` / `globalModalStore` 글로벌 facade
- 더 부드러운 fade/scale 기본 motion이 적용된 inline transport
- 네이티브 `<dialog>` 기반 optional top-layer transport
- ESC / backdrop light-dismiss 지원
- focus restore 및 간단한 focus trap
- inline body scroll lock
- `center`, `top`, `bottom-right` 같은 다양한 위치 지정 지원
- reduced-motion 대응

## Installation

```bash
pnpm add @ilokesto/modal react
```

또는

```bash
npm install @ilokesto/modal react
```

## Basic Usage

modal 내부 콘텐츠가 스스로 result를 넘기며 닫아야 하는 경우가 많기 때문에, 가장 실용적인 패턴은 stable `id`를 주고 `close(id, result)`를 콘텐츠 콜백에서 호출하는 방식입니다.

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

모듈 레벨 API를 선호한다면 기본 `ModalProvider`를 한 번 마운트한 뒤 `modal` facade를 사용할 수 있습니다.

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

inline transport가 기본값입니다. 이쪽이 animation과 backdrop 제어를 더 자연스럽게 할 수 있기 때문입니다.

네이티브 top-layer 렌더링이 필요하면 이렇게 사용할 수 있습니다.

```tsx
await display({
  id: 'settings-dialog',
  transport: 'top-layer',
  children: <SettingsDialog />,
});
```

이 경로는 내부적으로 네이티브 `<dialog>`를 사용합니다.

## Positioning

지원하는 `position` 값:

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

`@ilokesto/modal`은 닫는 순간 바로 remove하지 않고 overlay의 `closing` 상태를 활용합니다.

- open → fade in + scale in
- close → fade out + scale out
- remove → exit animation 완료 후 수행
- reduced motion → animation 대기 없이 빠르게 remove

즉 awaited result는 첫 close 요청 시점이 아니라, 실제로 modal이 제거된 뒤 resolve됩니다.

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

- `ModalAdapter.tsx` → inline / top-layer transport를 선택합니다
- `ModalAdapterInline.tsx` → backdrop, scroll lock, focus 처리, dismiss 동작, 위치 지정, animation이 들어간 inline modal 경로입니다
- `ModalAdapterTopLayer.tsx` → 네이티브 `<dialog>` 기반 top-layer 경로로, dialog cancel/backdrop handling, 위치 지정, scoped backdrop styling, animation을 담당합니다

### `src/components`

- `ModalProvider.tsx` → `OverlayProvider`를 감싸고 modal adapter를 등록하며 공유 CSS를 주입하고 기본적으로 global modal store를 사용합니다

### `src/facade`

- `modalFacade.ts` → 모듈 레벨에서 쓸 수 있는 `modal`과 `globalModalStore`를 export합니다

### `src/hooks`

- `useModal.ts` → `open`, `display`, `close`, `remove`, `clear`를 노출하는 React 명령형 API입니다

### `src/shared`

- `styles.ts` → 공용 fade/scale animation 스타일
- `types.ts` → modal props, adapter props, position contract

### `src/index.ts`

- public provider, hook, facade, types를 다시 export합니다

## Exports

- values → `ModalProvider`, `useModal`, `modal`, `globalModalStore`
- types → `ModalProviderProps`, `UseModalOptions`, `ModalFacadeOptions`, `ModalProps`, `ModalAdapterProps`, `ModalPosition`

## Development

```bash
pnpm install
pnpm run build
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다.

## License

MIT
