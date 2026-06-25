import { useOverlay } from '@ilokesto/overlay';
import type { ModalProps } from '../shared/types';

export type UseModalOptions<TResult = unknown> = ModalProps<TResult> & {
  id?: string;
};

export function useModal() {
  const { display, clear } = useOverlay();

  return {
    display: <TResult = unknown>(options: UseModalOptions<TResult>) => {
      return display<TResult>({
        id: options.id,
        type: 'modal',
        props: options as unknown as Record<string, unknown>,
      });
    },
    clear,
  };
}
