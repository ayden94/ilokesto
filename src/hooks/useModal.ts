import { useOverlay } from '@ilokesto/overlay';
import { assertExclusiveModalContent } from '../shared/types';
import type { ModalProps } from '../shared/types';

export type UseModalOptions<TResult = unknown> = ModalProps<TResult> & {
  id?: string;
};

export function useModal() {
  const overlay = useOverlay();

  return {
    open: <TResult = unknown>(options: UseModalOptions<TResult>) => {
      assertExclusiveModalContent(options);

      return overlay.open({
        id: options.id,
        type: 'modal',
        props: options as unknown as Record<string, unknown>,
      });
    },
    display: <TResult = unknown>(options: UseModalOptions<TResult>) => {
      assertExclusiveModalContent(options);

      return overlay.display<TResult>({
        id: options.id,
        type: 'modal',
        props: options as unknown as Record<string, unknown>,
      });
    },
    close: (id: string, result?: unknown) => overlay.close(id, result),
    remove: (id?: string) => overlay.remove(id),
    clear: () => overlay.clear(),
  };
}
