import { Store } from "@ilokesto/store";
import type {
  DisplayOptions,
  OverlayId,
  OverlayItem,
  OverlayRequest,
  OverlayState,
  OverlayStoreApi,
} from "../contracts/overlay";

type PendingResolver = (value: unknown | undefined) => void;

function createOverlayItem(options: DisplayOptions, id: OverlayId): OverlayItem {
  return {
    id,
    type: options.type,
    props: options.props ?? {},
    status: "open",
    createdAt: Date.now(),
  };
}

export function createOverlayStore(): OverlayStoreApi {
  const store = new Store<OverlayState>({ items: [] });
  const pendingResolvers = new Map<OverlayId, PendingResolver>();
  let counter = 0;

  function nextId(): OverlayId {
    counter += 1;
    return `overlay-${counter}-${Date.now()}`;
  }

  function settle(id: OverlayId, value: unknown | undefined): void {
    const resolver = pendingResolvers.get(id);

    if (!resolver) {
      return;
    }

    pendingResolvers.delete(id);
    resolver(value);
  }

  function open<TResult = unknown>(options: DisplayOptions): OverlayRequest<TResult> {
    const id = options.id ?? nextId();
    const item = createOverlayItem(options, id);

    const promise = new Promise<TResult | undefined>((resolve) => {
      pendingResolvers.set(id, resolve as PendingResolver);
    });

    store.setState((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));

    return { id, promise };
  }

  function close(id: OverlayId, result?: unknown): void {
    let shouldResolve = false;

    store.setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id || item.status === "closing") {
          return item;
        }

        shouldResolve = true;

        return {
          ...item,
          status: "closing",
        };
      }),
    }));

    if (shouldResolve) {
      settle(id, result);
    }
  }

  function remove(id?: OverlayId): void {
    const targetId = id ?? store.getState().items.at(-1)?.id;

    if (!targetId) {
      return;
    }

    const targetItem = store.getState().items.find((item) => item.id === targetId);

    if (!targetItem) {
      return;
    }

    if (targetItem.status !== "closing") {
      settle(targetId, undefined);
    }

    store.setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== targetId),
    }));
  }

  function clear(): void {
    for (const item of store.getState().items) {
      settle(item.id, undefined);
    }

    store.setState((prev) => ({
      ...prev,
      items: [],
    }));
  }

  function subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  }

  function getSnapshot(): ReadonlyArray<OverlayItem> {
    return store.getState().items;
  }

  function getInitialSnapshot(): ReadonlyArray<OverlayItem> {
    return store.getInitialState().items;
  }

  return {
    open,
    close,
    remove,
    clear,
    subscribe,
    getSnapshot,
    getInitialSnapshot,
  };
}
