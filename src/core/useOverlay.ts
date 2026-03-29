import { useCallback } from "react";
import { useOverlayContext } from "./OverlayProvider";
import type { DisplayOptions, OverlayId } from "../contracts/overlay";

export interface UseOverlayReturn {
  readonly display: <TResult = unknown>(
    options: DisplayOptions
  ) => Promise<TResult | undefined>;
  readonly open: (options: DisplayOptions) => OverlayId;
  readonly close: (id: OverlayId, result?: unknown) => void;
  readonly remove: (id?: OverlayId) => void;
  readonly clear: () => void;
}

export function useOverlay(): UseOverlayReturn {
  const { store } = useOverlayContext();

  const display = useCallback(
    <TResult = unknown>(options: DisplayOptions): Promise<TResult | undefined> => {
      const { promise } = store.open<TResult>(options);
      return promise;
    },
    [store]
  );

  const open = useCallback(
    (options: DisplayOptions): OverlayId => {
      const { id } = store.open(options);
      return id;
    },
    [store]
  );

  const close = useCallback(
    (id: OverlayId, result?: unknown): void => {
      store.close(id, result);
    },
    [store]
  );

  const remove = useCallback(
    (id?: OverlayId): void => {
      store.remove(id);
    },
    [store]
  );

  const clear = useCallback((): void => {
    store.clear();
  }, [store]);

  return { display, open, close, remove, clear };
}
