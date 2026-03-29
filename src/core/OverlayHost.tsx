import { useCallback } from "react";
import { useOverlayContext } from "./OverlayProvider";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayRenderProps } from "../contracts/adapter";
import type { OverlayItem } from "../contracts/overlay";

function OverlayItemRenderer({ item }: { readonly item: OverlayItem }) {
  const { store, adapters } = useOverlayContext();
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

export function OverlayHost() {
  const items = useOverlayItems();

  return (
    <>
      {items.map((item) => (
        <OverlayItemRenderer key={item.id} item={item} />
      ))}
    </>
  );
}
