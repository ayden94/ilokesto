import { useSyncExternalStore } from "react";
import type { ToastItem, ToastRuntimeApi } from "../types/toast";

export function useToastItems(runtime: ToastRuntimeApi): ReadonlyArray<ToastItem> {
  return useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getInitialSnapshot,
  );
}
