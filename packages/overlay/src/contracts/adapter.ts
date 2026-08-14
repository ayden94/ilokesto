import type { ComponentType } from "react";
import type { OverlayId, OverlayItem } from "./overlay";

export interface OverlayAdapterHooks {
  onOpen?: (id: OverlayId, item: OverlayItem) => void;
  onClosing?: (id: OverlayId, item: OverlayItem) => void;
  onUnmount?: (id: OverlayId) => void;
}

export interface OverlayRenderProps<TResult = unknown> {
  readonly id: string;
  readonly isOpen: boolean;
  readonly status: "open" | "closing";
  readonly close: (result?: TResult) => void;
  readonly remove: () => void;
  readonly useLifecycle: (hooks: OverlayAdapterHooks) => void;
}

export type OverlayAdapterComponent<TResult = unknown> = ComponentType<
  OverlayRenderProps<TResult> & Record<string, unknown>
>;

export type OverlayAdapterMap = Readonly<
  Record<string, OverlayAdapterComponent>
>;
