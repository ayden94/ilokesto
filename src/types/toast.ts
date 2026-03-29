import type { CSSProperties, ReactNode } from "react";

export type ToastId = string;
export type ToasterId = string;

export type ToastType = "blank" | "success" | "error" | "loading" | "custom";

export type ToastStatus = "visible" | "closing";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastTransport = "inline" | "top-layer";

export type Renderable = ReactNode;

export type ValueOrFunction<TValue, TArg> = TValue | ((arg: TArg) => TValue);

export interface ToastAriaProps {
  readonly role: "status" | "alert";
  readonly "aria-live": "polite" | "assertive";
  readonly "aria-atomic"?: boolean;
}

export interface IconTheme {
  readonly primary: string;
  readonly secondary: string;
}

export interface ToastItem {
  readonly id: ToastId;
  readonly type: ToastType;
  readonly message: Renderable;
  readonly status: ToastStatus;
  readonly createdAt: number;
  readonly toasterId: ToasterId;
  readonly duration: number;
  readonly position: ToastPosition;
  readonly height: number | null;
  readonly pauseDuration: number;
  readonly pausedAt: number | null;
  readonly ariaProps: ToastAriaProps;
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly iconTheme?: IconTheme;
  readonly removeDelay?: number;
 }

export interface ToastState {
  readonly items: ReadonlyArray<ToastItem>;
  readonly pausedAt: number | null;
}

export interface ToastOptions {
  readonly id?: ToastId;
  readonly toasterId?: ToasterId;
  readonly duration?: number;
  readonly position?: ToastPosition;
  readonly ariaProps?: ToastAriaProps;
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly iconTheme?: IconTheme;
  readonly removeDelay?: number;
}

export interface DefaultToastOptions extends ToastOptions {
  readonly success?: ToastOptions;
  readonly error?: ToastOptions;
  readonly loading?: ToastOptions;
  readonly blank?: ToastOptions;
  readonly custom?: ToastOptions;
}

export interface ToastOffsetOptions {
  readonly reverseOrder?: boolean;
  readonly gutter?: number;
}

export interface PromiseToastMessages<TData> {
  readonly loading: Renderable;
  readonly success: ValueOrFunction<Renderable, TData>;
  readonly error: ValueOrFunction<Renderable, unknown>;
}

export interface ToastStoreApi {
  add(item: ToastItem): void;
  update(id: ToastId, patch: Partial<Omit<ToastItem, "id" | "toasterId" | "createdAt">>): void;
  dismiss(id?: ToastId): void;
  remove(id?: ToastId): void;
  clear(): void;
  updateHeight(id: ToastId, height: number): void;
  startPause(): void;
  endPause(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyArray<ToastItem>;
  getInitialSnapshot(): ReadonlyArray<ToastItem>;
}

export interface ToastRuntimeApi {
  readonly toasterId: ToasterId;
  addToast(type: ToastType, message: Renderable, options?: ToastOptions): ToastId;
  configureView(config: { limit: number; position: ToastPosition; toastOptions?: DefaultToastOptions }): void;
  promiseToast<TData>(
    promise: Promise<TData> | (() => Promise<TData>),
    messages: PromiseToastMessages<TData>,
    options?: ToastOptions,
  ): Promise<TData>;
  dismiss(id?: ToastId): void;
  remove(id?: ToastId): void;
  clear(): void;
  updateHeight(id: ToastId, height: number): void;
  getRawSnapshot(): ReadonlyArray<ToastItem>;
  startPause(): void;
  endPause(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyArray<ToastItem>;
  getInitialSnapshot(): ReadonlyArray<ToastItem>;
}

export interface ToastRowHelpers {
  readonly dismiss: () => void;
  readonly remove: () => void;
}

export interface ToasterProps {
  readonly toasterId?: ToasterId;
  readonly position?: ToastPosition;
  readonly transport?: ToastTransport;
  readonly limit?: number;
  readonly reverseOrder?: boolean;
  readonly gutter?: number;
  readonly containerStyle?: CSSProperties;
  readonly containerClassName?: string;
  readonly toastOptions?: DefaultToastOptions;
  readonly children?: (item: ToastItem, helpers: ToastRowHelpers) => ReactNode;
}

export interface ToastFacade {
  (message: Renderable, options?: ToastOptions): ToastId;
  success(message: Renderable, options?: ToastOptions): ToastId;
  error(message: Renderable, options?: ToastOptions): ToastId;
  loading(message: Renderable, options?: ToastOptions): ToastId;
  custom(message: Renderable, options?: ToastOptions): ToastId;
  promise<TData>(
    promise: Promise<TData> | (() => Promise<TData>),
    messages: PromiseToastMessages<TData>,
    options?: ToastOptions,
  ): Promise<TData>;
  dismiss(id?: ToastId, toasterId?: ToasterId): void;
  remove(id?: ToastId, toasterId?: ToasterId): void;
}

export interface UseToasterResult {
  readonly toasts: ReadonlyArray<ToastItem>;
  readonly handlers: {
    updateHeight: (id: ToastId, height: number) => void;
    startPause: () => void;
    endPause: () => void;
    calculateOffset: (toast: ToastItem, options?: ToastOffsetOptions) => number;
  };
}
