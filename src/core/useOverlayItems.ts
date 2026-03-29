import { useSyncExternalStore } from "react";
import { useOverlayContext } from "./OverlayProvider";
import type { OverlayItem } from "../contracts/overlay";

export function useOverlayItems(): ReadonlyArray<OverlayItem> {
  const { store } = useOverlayContext();

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getInitialSnapshot
  );
}
