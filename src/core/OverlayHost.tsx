import { useCallback } from "react";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayRenderProps } from "../contracts/adapter";
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

  const close = useCallback(
    (result?: unknown) => {
      store.close(item.id, result);
    },
    [item.id, store]
  );

  const remove = useCallback(() => {
    store.remove(item.id);
  }, [item.id, store]);

  if (!Adapter) {
    return null;
  }

  const renderProps: OverlayRenderProps = {
    id: item.id,
    isOpen: item.status === "open",
    status: item.status,
    close,
    remove,
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
