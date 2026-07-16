import type { OverlayId, OverlayItem } from "./overlay";

export interface OverlayPlugin {
  readonly name: string;
  onOpen?: (id: OverlayId, item: OverlayItem) => void;
  onClosing?: (id: OverlayId, item: OverlayItem) => void;
  onUnmount?: (id: OverlayId) => void;
}
