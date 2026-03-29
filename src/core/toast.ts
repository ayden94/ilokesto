import { requireRuntime } from "./registry";
import { DEFAULT_TOASTER_ID } from "./utils";
import type {
  PromiseToastMessages,
  Renderable,
  ToastFacade,
  ToastId,
  ToastOptions,
  ToasterId,
} from "../types/toast";

function resolveToasterId(options?: ToastOptions): ToasterId {
  return options?.toasterId ?? DEFAULT_TOASTER_ID;
}

function createToast(message: Renderable, options?: ToastOptions): ToastId {
  const runtime = requireRuntime(resolveToasterId(options));
  return runtime.addToast("blank", message, options);
}

createToast.success = function success(message: Renderable, options?: ToastOptions): ToastId {
  const runtime = requireRuntime(resolveToasterId(options));
  return runtime.addToast("success", message, options);
};

createToast.error = function error(message: Renderable, options?: ToastOptions): ToastId {
  const runtime = requireRuntime(resolveToasterId(options));
  return runtime.addToast("error", message, options);
};

createToast.loading = function loading(message: Renderable, options?: ToastOptions): ToastId {
  const runtime = requireRuntime(resolveToasterId(options));
  return runtime.addToast("loading", message, {
    ...options,
    duration: Number.POSITIVE_INFINITY,
  });
};

createToast.custom = function custom(message: Renderable, options?: ToastOptions): ToastId {
  const runtime = requireRuntime(resolveToasterId(options));
  return runtime.addToast("custom", message, options);
};

createToast.promise = function promiseFn<TData>(
  promise: Promise<TData> | (() => Promise<TData>),
  messages: PromiseToastMessages<TData>,
  options?: ToastOptions,
): Promise<TData> {
  const runtime = requireRuntime(resolveToasterId(options));
  return runtime.promiseToast(promise, messages, options);
};

createToast.dismiss = function dismiss(id?: ToastId, toasterId?: ToasterId): void {
  const runtime = requireRuntime(toasterId ?? DEFAULT_TOASTER_ID);
  runtime.dismiss(id);
};

createToast.remove = function remove(id?: ToastId, toasterId?: ToasterId): void {
  const runtime = requireRuntime(toasterId ?? DEFAULT_TOASTER_ID);
  runtime.remove(id);
};

export const toast: ToastFacade = createToast;
