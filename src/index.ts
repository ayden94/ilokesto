export { ModalProvider } from './components/ModalProvider';
export type { ModalProviderProps } from './components/ModalProvider';

export { useModal } from './hooks/useModal';
export type { UseModalOptions } from './hooks/useModal';

export { modal, globalModalStore } from './facade/modalFacade';
export type { ModalFacadeOptions } from './facade/modalFacade';

export type {
  ModalAdapterProps,
  ModalClose,
  ModalCloseHandler,
  ModalPosition,
  ModalProps,
  ModalRender,
  ModalRenderContext,
} from './shared/types';
