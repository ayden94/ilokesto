import { useSyncExternalStore } from "react";
import type { OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";

export function useOverlayItems(getContext: OverlayContextGetter): ReadonlyArray<OverlayItem> {
  const { store } = getContext();

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getInitialSnapshot
  );
}
