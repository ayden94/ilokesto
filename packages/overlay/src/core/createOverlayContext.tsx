import { createContext, useContext, useMemo } from "react";
import type { FC } from "react";
import { createOverlayStore } from "./createOverlayStore";
import { OverlayHost } from "./OverlayHost";
import { useOverlay as useOverlayImpl } from "./useOverlay";
import { useOverlayItems as useOverlayItemsImpl } from "./useOverlayItems";
import { useOverlayItem as useOverlayItemImpl } from "./useOverlayItem";
import type { OverlayAdapterMap } from "../contracts/adapter";
import type { OverlayId, OverlayItem, OverlayProviderProps, OverlayStoreApi } from "../contracts/overlay";
import type { OverlayPlugin } from "../contracts/plugin";
import type { UseOverlayReturn } from "./useOverlay";

export interface OverlayContextValue {
  readonly store: OverlayStoreApi;
  readonly adapters: OverlayAdapterMap;
  readonly plugins: ReadonlyArray<OverlayPlugin>;
}

export interface OverlayContextInstance {
  readonly Provider: FC<OverlayProviderProps>;
  readonly useOverlay: () => UseOverlayReturn;
  readonly useOverlayItems: () => ReadonlyArray<OverlayItem>;
  readonly useOverlayItem: (id: OverlayId) => OverlayItem | undefined;
}

export function createOverlayContext(): OverlayContextInstance {
  const context = createContext<OverlayContextValue | null>(null);

  function useOverlayContext(): OverlayContextValue {
    const ctx = useContext(context);

    if (ctx === null) {
      throw new Error("useOverlay must be used within an <OverlayProvider>.");
    }

    return ctx;
  }

  function Provider({ adapters, children, store: storeProp, plugins }: OverlayProviderProps) {
    const store = useMemo<OverlayStoreApi>(
      () => storeProp ?? createOverlayStore(),
      [storeProp]
    );

    const pluginsRef = useMemo<ReadonlyArray<OverlayPlugin>>(
      () => plugins ?? [],
      [plugins]
    );

    const value = useMemo<OverlayContextValue>(
      () => ({ store, adapters, plugins: pluginsRef }),
      [store, adapters, pluginsRef]
    );

    return (
      <context.Provider value={value}>
        {children}
        <OverlayHost useOverlayContext={useOverlayContext} />
      </context.Provider>
    );
  }

  const useOverlay = () => useOverlayImpl(useOverlayContext);
  const useOverlayItems = () => useOverlayItemsImpl(useOverlayContext);
  const useOverlayItem = (id: Parameters<typeof useOverlayItemImpl>[1]) =>
    useOverlayItemImpl(useOverlayContext, id);

  return { Provider, useOverlay, useOverlayItems, useOverlayItem };
}
