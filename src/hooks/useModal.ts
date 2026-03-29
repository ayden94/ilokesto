import { useOverlay } from '@ilokesto/overlay';
import type { ModalProps } from '../shared/types';

export interface UseModalOptions extends ModalProps {
  id?: string;
}

export function useModal() {
  const overlay = useOverlay();

  return {
    open: (options: UseModalOptions) => {
      return overlay.open({
        id: options.id,
        type: 'modal',
        props: options as unknown as Record<string, unknown>,
      });
    },
    display: <TResult = unknown>(options: UseModalOptions) => {
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
