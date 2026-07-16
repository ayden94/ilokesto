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
  /**
   * Set by `reject(id, reason)`. On `remove(id)`, the pending Promise is
   * rejected with this reason instead of being resolved.
   */
  readonly rejectReason?: unknown;
  /**
   * True once `reject(id, reason)` has been called. Distinguishes
   * `reject(id, undefined)` (should reject) from a plain `remove(id)` (should
   * resolve), since `rejectReason` itself may be `undefined`.
   */
  readonly rejected?: boolean;
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
  closeAll: () => void;
  reject: (id: OverlayId, reason?: unknown) => void;
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
