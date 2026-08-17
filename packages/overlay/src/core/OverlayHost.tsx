import { useCallback, useEffect, useRef } from "react";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayAdapterHooks, OverlayRenderProps } from "../contracts/adapter";
import type { OverlayId, OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";

interface OverlayHostProps {
  readonly useOverlayContext: OverlayContextGetter;
}

function OverlayItemRenderer({
  item,
  getContext,
}: {
  readonly item: OverlayItem;
  readonly getContext: OverlayContextGetter;
}) {
  const { store, adapters, plugins } = getContext();
  const Adapter = adapters[item.type];
  const hooksRef = useRef<OverlayAdapterHooks | null>(null);
  const prevStatusRef = useRef<"open" | "closing" | "mounted">("mounted");
  const missingAdapterReportedRef = useRef(false);

  const close = useCallback(
    (result?: unknown) => {
      store.close(item.id, result);
    },
    [item.id, store]
  );

  const remove = useCallback(() => {
    store.remove(item.id);
  }, [item.id, store]);

  const useLifecycle = (hooks: OverlayAdapterHooks) => {
    hooksRef.current = hooks;
  };

  function runPhase(
    phase: "onOpen" | "onClosing" | "onUnmount",
    id: OverlayId,
    item: OverlayItem
  ): void {
    const adapterHook = hooksRef.current?.[phase];
    if (adapterHook) {
      adapterHook(id, item);
      return;
    }
    for (const plugin of plugins) {
      plugin[phase]?.(id, item);
    }
  }

  useEffect(() => {
    if (prevStatusRef.current === "mounted" && item.status === "open") {
      runPhase("onOpen", item.id, item);
    } else if (
      prevStatusRef.current === "open" &&
      item.status === "closing"
    ) {
      runPhase("onClosing", item.id, item);
    }
    prevStatusRef.current = item.status;
  }, [item.status, item.id]);

  useEffect(() => {
    return () => {
      runPhase("onUnmount", item.id, item);
    };
  }, [item.id]);

  useEffect(() => {
    if (
      typeof process === "undefined" ||
      process.env.NODE_ENV !== "development" ||
      Adapter ||
      missingAdapterReportedRef.current
    ) {
      return;
    }

    missingAdapterReportedRef.current = true;
    console.error("[@ilokesto/overlay] Missing adapter", {
      id: item.id,
      type: item.type,
    });
  }, [Adapter, item.id, item.type]);

  if (!Adapter) {
    return null;
  }

  const renderProps: OverlayRenderProps = {
    id: item.id,
    isOpen: item.status === "open",
    status: item.status,
    close,
    remove,
    useLifecycle,
  };

  return <Adapter {...item.props} {...renderProps} />;
}

export function OverlayHost({ useOverlayContext }: OverlayHostProps) {
  const items = useOverlayItems(useOverlayContext);

  return (
    <>
      {items.map((item) => (
        <OverlayItemRenderer
          key={item.id}
          item={item}
          getContext={useOverlayContext}
        />
      ))}
    </>
  );
}
