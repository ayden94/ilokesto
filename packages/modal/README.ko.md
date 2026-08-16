# @ilokesto/modal

[English](./README.md) | **한국어**

Grunfeld의 awaitable dialog 철학을 유지하면서, 기본 motion을 더 부드럽게 만든 `@ilokesto/overlay` 기반 React modal 패키지입니다.

`@ilokesto/modal`은 modal 정책을 패키지 내부에 둡니다. dismiss 규칙, focus 처리, scroll lock, inline / top-layer transport, backdrop 동작, enter/exit animation은 이 패키지에서 담당하고, `@ilokesto/overlay`는 presence lifecycle만 맡습니다. 그래서 modal은 닫히는 동안에도 잠깐 살아 있으면서 exit motion을 끝낸 뒤 resolve될 수 있습니다.

## Features

- **Awaitable modal flow** — `display()`가 exit 애니메이션 완료 후 resolve되는 Promise 반환
- **Hook 기반 API** — `useModal()`로 `display`, `close`, `closeAll`, `reject`, `remove`, `clear` 제공
- **글로벌 facade** — 모듈 레벨에서 사용할 수 있는 `modal`과 `globalModalStore`
- **provider-scoped stack 정책** — provider마다 독립적인 topness, z-index, dismiss, focus 정책
- **inline transport** — 기본 fade/scale motion으로 완전한 제어
- **top-layer transport** — 네이티브 `<dialog>` + `showModal()`
- **ESC / backdrop dismiss** — `onDismiss` 콜백과 함께 light dismiss 지원
- **focus 관리** — auto-focus, focus 복원, Tab focus trap (inline), 네이티브 (top-layer)
- **scroll lock** — 참조 카운팅 기반 body scroll lock
- **위치 지정** — `center`, `top`, `bottom`, `left`, `right` 및 코너 변형
- **reduced motion** — `prefers-reduced-motion: reduce` 시 즉시 제거
- **closeAll** — exit 애니메이션과 함께 일괄 닫기
- **reject** — `reject(id, reason)` → Promise 거부로 에러 흐름 처리
- **onModalClose vs onDismiss** — 모든 close vs light-dismiss를 구분하는 별도 콜백

## 목차

- [설치](#설치)
- [기본 사용법](#기본-사용법)
- [Close Lifecycle](#close-lifecycle)
- [글로벌 Facade](#글로벌-facade)
- [Top-Layer Transport](#top-layer-transport)
- [접근성](#접근성)
- [위치 지정](#위치-지정)
- [Motion Model](#motion-model)
- [API 레퍼런스](#api-레퍼런스)
- [소스 구조](#소스-구조)
- [개발](#개발)
- [라이선스](#라이선스)

## 설치

```bash
pnpm add @ilokesto/modal react
```

또는

```bash
npm install @ilokesto/modal react
```

## 기본 사용법

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
    const confirmed = await display<boolean>({
      id: 'delete-confirm',
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

### reject

`reject(id, reason)`은 modal을 `closing`으로 전환하지만 (`close`와 동일), 어댑터가 이후 `remove(id)`를 호출할 때 `display()` Promise가 `reason`과 함께 **reject** 됩니다. `onModalClose`도 `undefined` 인자로 발생합니다 (reject는 close 경로).

## 글로벌 Facade

모듈 레벨 API를 선호한다면 기본 `ModalProvider`를 한 번 마운트한 뒤 `modal` facade를 사용할 수 있습니다.

`store`가 없는 provider는 하나만 지원합니다. 모든 기본 provider는 `globalModalStore`를 공유하므로 여러 개를 마운트해도 독립적인 facade stack이 만들어지지 않습니다. 여러 provider를 동시에 사용하려면 각 `ModalProvider`에 서로 다른 overlay store를 전달하세요. 그러면 각 provider가 inline 및 top-layer transport의 modal stack 정책을 독립적으로 소유합니다.

```tsx
import { ModalProvider, modal } from '@ilokesto/modal';

function App() {
  return <ModalProvider>{/* your app */}</ModalProvider>;
}

async function openGlobalConfirm() {
  const result = await modal.display<boolean>({
    id: 'global-confirm',
    render: (close) => (
      <div>
        <button onClick={() => close(true)}>Confirm</button>
        <button onClick={() => close(false)}>Cancel</button>
      </div>
    ),
  });

  return result;
}

// 이것도 사용 가능: modal.close, modal.closeAll, modal.reject, modal.remove, modal.clear
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

## 접근성

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

## 위치 지정

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

## API 레퍼런스

### `ModalProvider`

Context provider. `@ilokesto/overlay`의 `OverlayProvider`를 감싸고, modal adapter를 등록하고, 공유 CSS를 주입하며, 두 transport가 사용하는 내부 stack runtime을 소유합니다. Props: `children`, `store?`.

### `useModal()`

`{ display, close, closeAll, reject, remove, clear }`를 반환합니다.

- `display<TResult>(options)` — modal을 열고 `Promise<TResult | undefined>` 반환
- `close(id, result?)` — modal을 `closing`으로 전환하며 result 설정
- `closeAll()` — 모든 open modal을 `closing`으로 전환
- `reject(id, reason?)` — modal을 `closing`으로 전환, `remove` 시 Promise 거부
- `remove(id?)` — modal을 store에서 제거 (Promise resolve/reject)
- `clear()` — 모든 modal을 즉시 제거

### `modal` (facade)

모듈 레벨 API. `useModal()`과 동일한 메서드 + `open(options)` (id만 반환).

### `globalModalStore`

미리 생성된 lifecycle store. `<ModalProvider store={...}>`로 전달하여 커스텀 통합에 사용 가능.

### 타입

- `ModalProviderProps`, `UseModalOptions`, `ModalFacadeOptions`
- `ModalProps`, `ModalAdapterProps`, `ModalPosition`
- `ModalClose`, `ModalCloseHandler`, `ModalRender`, `ModalRenderContext`

## 소스 구조

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
    useIsTopModal.ts
    useModal.ts
    usePrefersReducedMotion.ts
  shared/
    lifecycle.ts
    styles.ts
    types.ts
  index.ts
```

### 책임 분리

**`src/adapters`** — 렌더링:
- `ModalAdapter.tsx` — inline / top-layer transport 선택
- `ModalAdapterInline.tsx` — inline modal: backdrop, scroll lock, focus, dismiss, 위치 지정, animation
- `ModalAdapterTopLayer.tsx` — 네이티브 `<dialog>`: cancel/backdrop 처리, 위치 지정, scoped backdrop, animation

**`src/components`** — provider:
- `ModalProvider.tsx` — `OverlayProvider` 감싸기, modal stack 정책 소유, adapter 등록, CSS 주입, 기본 global store 사용

**`src/facade`** — 모듈 레벨 API:
- `modalFacade.ts` — `modal` facade와 `globalModalStore`

**`src/hooks`** — React 훅:
- `useModal.ts` — 명령형 API (`display`, `close`, `closeAll`, `reject`, `remove`, `clear`)
- `useIsTopModal.ts` — z-index, dismiss, focus 관리를 위한 provider-scoped modal stack 추적
- `usePrefersReducedMotion.ts` — 레거시 fallback 포함 `prefers-reduced-motion` 감지

**`src/shared`** — 내부:
- `lifecycle.ts` — `createModalLifecycleStore`로 `OverlayStoreApi`를 래핑하여 `onModalClose` 주입
- `styles.ts` — 공용 fade/scale animation keyframes
- `types.ts` — modal props, render callback, adapter props, position contract

## Exports

- values → `ModalProvider`, `useModal`, `modal`, `globalModalStore`
- types → `ModalProviderProps`, `UseModalOptions`, `ModalFacadeOptions`, `ModalProps`, `ModalAdapterProps`, `ModalPosition`, `ModalClose`, `ModalCloseHandler`, `ModalRender`, `ModalRenderContext`

## 개발

```bash
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
```

빌드 결과물은 `dist` 디렉터리에 생성됩니다. 테스트는 Vitest와 @testing-library/react로 실행됩니다. E2E 및 접근성 테스트는 Playwright를 사용합니다.

## 라이선스

MIT
