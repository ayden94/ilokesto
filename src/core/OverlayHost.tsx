import { useCallback, useEffect, useRef } from "react";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayAdapterHooks, OverlayRenderProps } from "../contracts/adapter";
import type { OverlayItem } from "../contracts/overlay";
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
  const { store, adapters } = getContext();
  const Adapter = adapters[item.type];
  const hooksRef = useRef<OverlayAdapterHooks | null>(null);
  const prevStatusRef = useRef<"open" | "closing" | "mounted">("mounted");

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

  useEffect(() => {
    if (prevStatusRef.current === "mounted" && item.status === "open") {
      hooksRef.current?.onOpen?.(item.id, item);
    } else if (
      prevStatusRef.current === "open" &&
      item.status === "closing"
    ) {
      hooksRef.current?.onClosing?.(item.id, item);
    }
    prevStatusRef.current = item.status;
  }, [item.status, item.id]);

  useEffect(() => {
    return () => {
      hooksRef.current?.onUnmount?.(item.id);
    };
  }, [item.id]);

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

  return <Adapter {...renderProps} {...item.props} />;
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
