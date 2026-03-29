import { useCallback, useContext, useMemo } from "react";
import { ToasterContext } from "../components/ToastProvider";
import type {
  ToastItem,
  ToastOffsetOptions,
  UseToasterResult,
} from "../types/toast";
import { DEFAULT_GUTTER } from "../core/utils";
import { useToastItems } from "./useToastItems";

export function useToaster(): UseToasterResult {
  const runtime = useContext(ToasterContext);

  if (runtime === null) {
    throw new Error(
      "useToaster must be used within a <Toaster> component.",
    );
  }

  const toasts = useToastItems(runtime);

  const calculateOffset = useCallback(
    (toast: ToastItem, options?: ToastOffsetOptions): number => {
      const gutter = options?.gutter ?? DEFAULT_GUTTER;
      const ordered = options?.reverseOrder ? [...toasts].reverse() : toasts;
      const index = ordered.findIndex((item) => item.id === toast.id);

      if (index === -1) {
        return 0;
      }

      return ordered.slice(0, index).reduce((offset, item) => {
        return offset + (item.height ?? 0) + gutter;
      }, 0);
    },
    [toasts],
  );

  return useMemo(
    () => ({
      toasts,
      handlers: {
        updateHeight: runtime.updateHeight,
        startPause: runtime.startPause,
        endPause: runtime.endPause,
        calculateOffset,
      },
    }),
    [calculateOffset, runtime.endPause, runtime.startPause, runtime.updateHeight, toasts],
  );
}
