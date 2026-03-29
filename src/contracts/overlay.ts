import type { ReactNode } from "react";
import type { OverlayAdapterMap } from "./adapter";

export type OverlayId = string;

export type OverlayStatus = "open" | "closing";

export interface OverlayItem {
  readonly id: OverlayId;
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly status: OverlayStatus;
  readonly createdAt: number;
  readonly closeResult?: unknown;
}

export interface OverlayState {
  readonly items: ReadonlyArray<OverlayItem>;
}

export interface DisplayOptions {
  readonly id?: OverlayId;
  readonly type: string;
  readonly props?: Record<string, unknown>;
}

export interface OverlayRequest<TResult = unknown> {
  readonly id: OverlayId;
  readonly promise: Promise<TResult | undefined>;
}

export interface OverlayStoreApi {
  open: <TResult = unknown>(options: DisplayOptions) => OverlayRequest<TResult>;
  close: (id: OverlayId, result?: unknown) => void;
  remove: (id?: OverlayId) => void;
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ReadonlyArray<OverlayItem>;
  getInitialSnapshot: () => ReadonlyArray<OverlayItem>;
}

export interface OverlayProviderProps {
  readonly adapters: OverlayAdapterMap;
  readonly children: ReactNode;
  readonly store?: OverlayStoreApi;
}
