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

modal content는 `render`로 제공합니다. render callback은 해당 modal 인스턴스에만 묶인 `close(result)` 함수와 context를 받습니다. 정적인 content도 `render: () => ...` 형태로 전달하세요.

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

modal이 닫힐 때마다 callback이 필요하면 `onModalClose(result)`를 사용하세요. `render`에서 받은 scoped `close(result)`를 호출하면 해당 modal의 callback만 같은 result로 한 번 호출됩니다. `clear()`를 호출하면 열려 있는 모든 modal의 `onModalClose`가 stack 순서대로 호출된 뒤 제거됩니다.

`onDismiss`는 더 좁은 이벤트입니다. dismissible modal이 ESC 또는 backdrop click으로 dismiss될 때만 호출됩니다.

### closeAll과 onModalClose

`closeAll()`은 모든 open modal을 `closing`으로 전환하되 `closeResult`를 설정하지 않습니다. lifecycle store는 `closeAll()` 자체에서 `onModalClose`를 발생시키지 **않습니다**. 하지만 어댑터가 이후 exit 애니메이션을 완료하고 각 modal에 대해 `remove(id)`를 호출하면, `closeResult`가 `undefined`이므로 `onModalClose(undefined)`가 간접적으로 발생합니다.

| 시퀀스 | `onModalClose` 인자 |
|---|---|
| `close(id, result)` → `remove(id)` | `result` |
| `closeAll()` → `remove(id)` | `undefined` |
| `remove(id)` (close 없이) | `undefined` |
| `clear()` | `closeResult` 또는 `undefined` |

`onModalClose`에서 batch-close와 개별 close를 구분해야 한다면, `closeAll()` 호출 전에 플래그를 확인하거나 별도의 `onDismiss` 핸들러를 사용하세요.

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

inline transport가 기본값입니다. 이쪽이 animation과 backdrop 제어를 더 자연스럽게 할 수 있기 때문입니다.

네이티브 top-layer 렌더링이 필요하면 이렇게 사용할 수 있습니다.

```tsx
await display({
  id: 'settings-dialog',
  transport: 'top-layer',
  render: (close) => <SettingsDialog onClose={() => close()} />,
});
```

이 경로는 내부적으로 네이티브 `<dialog>`를 사용합니다.

## Accessibility

modal에는 항상 접근 가능한 이름을 제공하세요. 권장 패턴은 화면에 보이는 heading을 렌더링하고 `ariaLabelledBy`로 연결하는 것입니다. 안내 문구나 결과 설명이 있으면 `ariaDescribedBy`도 함께 연결하세요.

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

보이는 제목이 없는 dialog라면 `ariaLabel`을 사용하세요. `role: 'alertdialog'`는 즉각적인 주의가 필요한 중요한 확인 흐름에만 사용하세요.

### React Compiler note

`render` callback은 순수하게 유지해야 합니다. callback 안에서 hook 호출, 중첩 컴포넌트 정의, 캡처 값 mutation, side effect 실행을 하지 마세요. hook이 필요한 modal body는 실제 컴포넌트로 분리하고 `close`를 prop으로 넘기세요.

```tsx
// 좋음: hook은 render callback 안이 아니라 SettingsDialog 내부에 있습니다.
await display({
  ariaLabel: 'Settings',
  render: (close) => <SettingsDialog onClose={() => close()} />,
});

// 피하세요: render callback 안에서 hook을 호출하면 Rules of Hooks 위반입니다.
await display({
  ariaLabel: 'Settings',
  render: (close) => {
    // const value = useSomething(); // 이렇게 하지 마세요.
    return <SettingsDialog onClose={() => close()} />;
  },
});
```

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

- `useModal.ts` → `display`, `clear`를 노출하는 React 명령형 API입니다

### `src/shared`

- `styles.ts` → 공용 fade/scale animation 스타일
- `types.ts` → modal props, scoped render callback, adapter props, position contract

### `src/index.ts`

- public provider, hook, facade, types를 다시 export합니다

## Exports

- values → `ModalProvider`, `useModal`, `modal`, `globalModalStore`
- types → `ModalProviderProps`, `UseModalOptions`, `ModalFacadeOptions`, `ModalProps`, `ModalAdapterProps`, `ModalPosition`, `ModalClose`, `ModalRender`, `ModalRenderContext`

## Development

```bash
pnpm install
pnpm run build
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다.

## License

MIT
