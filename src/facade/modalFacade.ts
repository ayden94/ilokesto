import { createOverlayStore } from '@ilokesto/overlay';
import { createModalLifecycleStore } from '../shared/lifecycle';
import type { ModalProps } from '../shared/types';

export const globalModalStore = createModalLifecycleStore(createOverlayStore());

export type ModalFacadeOptions<TResult = unknown> = ModalProps<TResult> & {
  id?: string;
};

export const modal = {
  open: <TResult = unknown>(options: ModalFacadeOptions<TResult>) => {
    return globalModalStore.open<TResult>({
      id: options.id,
      type: 'modal',
      props: options as unknown as Record<string, unknown>,
    }).id;
  },
  display: <TResult = unknown>(options: ModalFacadeOptions<TResult>) => {
    return globalModalStore.open<TResult>({
      id: options.id,
      type: 'modal',
      props: options as unknown as Record<string, unknown>,
    }).promise;
  },
  close: (id: string, result?: unknown) => globalModalStore.close(id, result),
  closeAll: () => globalModalStore.closeAll(),
  reject: (id: string, reason?: unknown) => globalModalStore.reject(id, reason),
  remove: (id?: string) => globalModalStore.remove(id),
  clear: () => globalModalStore.clear(),
};
