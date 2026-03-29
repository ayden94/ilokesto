import { createContext, useContext, useMemo } from "react";
import { createOverlayStore } from "./createOverlayStore";
import { OverlayHost } from "./OverlayHost";
import type { OverlayAdapterMap } from "../contracts/adapter";
import type { OverlayProviderProps, OverlayStoreApi } from "../contracts/overlay";

interface OverlayContextValue {
  readonly store: OverlayStoreApi;
  readonly adapters: OverlayAdapterMap;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlayContext(): OverlayContextValue {
  const context = useContext(OverlayContext);

  if (context === null) {
    throw new Error(
      "useOverlayContext must be used within an <OverlayProvider>."
    );
  }

  return context;
}

export function OverlayProvider({
  adapters,
  children,
  store: storeProp,
}: OverlayProviderProps) {
  const store = useMemo<OverlayStoreApi>(
    () => storeProp ?? createOverlayStore(),
    [storeProp]
  );

  const value = useMemo<OverlayContextValue>(
    () => ({ store, adapters }),
    [store, adapters]
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <OverlayHost />
    </OverlayContext.Provider>
  );
}
