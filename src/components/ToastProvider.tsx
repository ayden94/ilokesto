import { createContext, useEffect, useMemo } from "react";
import { createToastRuntime } from "../core/createToastRuntime";
import { registerRuntime, unregisterRuntime } from "../core/registry";
import { DEFAULT_TOASTER_ID } from "../core/utils";
import type { ToasterId, ToastRuntimeApi } from "../types/toast";

export const ToasterContext = createContext<ToastRuntimeApi | null>(null);

export function useToasterRuntime(toasterId: ToasterId = DEFAULT_TOASTER_ID): ToastRuntimeApi {
  const runtime = useMemo(() => createToastRuntime(toasterId), [toasterId]);

  useEffect(() => {
    registerRuntime(runtime);

    return () => {
      runtime.clear();
      unregisterRuntime(runtime.toasterId);
    };
  }, [runtime]);

  return runtime;
}
