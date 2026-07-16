import { createOverlayContext } from "./createOverlayContext";
import type { OverlayContextValue } from "./createOverlayContext";

const defaultContext = createOverlayContext();

export const OverlayProvider = defaultContext.Provider;
export const useOverlay = defaultContext.useOverlay;
export const useOverlayItems = defaultContext.useOverlayItems;
export const useOverlayItem = defaultContext.useOverlayItem;

export type { OverlayContextValue };
