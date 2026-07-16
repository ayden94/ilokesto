import { useRef, type MutableRefObject } from "react";
import type { OverlayAdapterHooks } from "../contracts/adapter";

export type LifecycleHooksRef = MutableRefObject<OverlayAdapterHooks | null>;

export function useOverlayLifecycle(
  hooksRef: LifecycleHooksRef,
  hooks: OverlayAdapterHooks
): void {
  hooksRef.current = hooks;
}
