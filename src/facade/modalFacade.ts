import { createOverlayStore } from '@ilokesto/overlay';
import { assertExclusiveModalContent } from '../shared/types';
import type { ModalProps } from '../shared/types';

export const globalModalStore = createOverlayStore();

export type ModalFacadeOptions<TResult = unknown> = ModalProps<TResult> & {
  id?: string;
};

export const modal = {
  open: <TResult = unknown>(options: ModalFacadeOptions<TResult>) => {
    assertExclusiveModalContent(options);

    return globalModalStore.open<TResult>({
      id: options.id,
      type: 'modal',
      props: options as unknown as Record<string, unknown>,
    }).id;
  },
  display: <TResult = unknown>(options: ModalFacadeOptions<TResult>) => {
    assertExclusiveModalContent(options);

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
