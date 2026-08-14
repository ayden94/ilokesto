import type { OverlayId, OverlayItem } from "./overlay";

export interface OverlayPlugin {
  readonly name: string;
  readonly onOpen?: (id: OverlayId, item: OverlayItem) => void;
  readonly onClosing?: (id: OverlayId, item: OverlayItem) => void;
  readonly onUnmount?: (id: OverlayId) => void;
}
