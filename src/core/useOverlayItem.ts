import { useSyncExternalStore } from "react";
import type { OverlayId, OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";

export function useOverlayItem(
  getContext: OverlayContextGetter,
  id: OverlayId
): OverlayItem | undefined {
  const { store } = getContext();

  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().find((item) => item.id === id),
    () => undefined
  );
}
