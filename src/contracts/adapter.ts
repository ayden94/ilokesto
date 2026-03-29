import type { ComponentType } from "react";

export interface OverlayRenderProps<TResult = unknown> {
  readonly id: string;
  readonly isOpen: boolean;
  readonly status: "open" | "closing";
  readonly close: (result?: TResult) => void;
  readonly remove: () => void;
}

export type OverlayAdapterComponent<TResult = unknown> = ComponentType<
  OverlayRenderProps<TResult> & Record<string, unknown>
>;

export type OverlayAdapterMap = Readonly<
  Record<string, OverlayAdapterComponent>
>;
