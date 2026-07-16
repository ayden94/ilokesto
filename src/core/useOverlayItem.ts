import { useSyncExternalStore } from "react";
import { useOverlayContext } from "./OverlayProvider";
import type { OverlayId, OverlayItem } from "../contracts/overlay";

export function useOverlayItem(id: OverlayId): OverlayItem | undefined {
  const { store } = useOverlayContext();

  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().find((item) => item.id === id),
    () => undefined
  );
}