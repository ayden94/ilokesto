import { createOverlayStore } from '@ilokesto/overlay';
import type { ModalProps } from './types';

export const globalModalStore = createOverlayStore();

export interface ModalFacadeOptions extends ModalProps {
  id?: string;
}

export const modal = {
  open: <TResult = unknown>(options: ModalFacadeOptions) => {
    return globalModalStore.open<TResult>({
      id: options.id,
      type: 'modal',
      props: options as unknown as Record<string, unknown>,
    }).id;
  },
  display: <TResult = unknown>(options: ModalFacadeOptions) => {
    return globalModalStore.open<TResult>({
      id: options.id,
      type: 'modal',
      props: options as unknown as Record<string, unknown>,
    }).promise;
  },
  close: (id: string, result?: unknown) => globalModalStore.close(id, result),
  remove: (id?: string) => globalModalStore.remove(id),
  clear: () => globalModalStore.clear(),
};
