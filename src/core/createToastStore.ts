import { Store } from "@ilokesto/store";
import type { ToastId, ToastItem, ToastState, ToastStoreApi } from "../types/toast";

export function createToastStore(): ToastStoreApi {
  const store = new Store<ToastState>({ items: [], pausedAt: null });

  function add(item: ToastItem): void {
    store.setState((prev) => {
      const existingIndex = prev.items.findIndex((current) => current.id === item.id);

      if (existingIndex === -1) {
        return {
          ...prev,
          items: [...prev.items, item],
        };
      }

      return {
        ...prev,
        items: prev.items.map((current) =>
          current.id === item.id
            ? {
                ...current,
                ...item,
                createdAt: current.createdAt,
                toasterId: current.toasterId,
              }
            : current,
        ),
      };
    });
  }

  function update(
    id: ToastId,
    patch: Partial<Omit<ToastItem, "id" | "toasterId" | "createdAt">>,
  ): void {
    store.setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));
  }

  function dismiss(id?: ToastId): void {
    store.setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (id !== undefined && item.id !== id) {
          return item;
        }

        if (item.status === "closing") {
          return item;
        }

        return {
          ...item,
          status: "closing",
        };
      }),
    }));
  }

  function remove(id?: ToastId): void {
    store.setState((prev) => ({
      ...prev,
      items: id === undefined
        ? []
        : prev.items.filter((item) => item.id !== id),
    }));
  }

  function clear(): void {
    store.setState({ items: [], pausedAt: null });
  }

  function updateHeight(id: ToastId, height: number): void {
    update(id, { height });
  }

  function startPause(): void {
    const startedAt = Date.now();

    store.setState((prev) => {
      if (prev.pausedAt !== null) {
        return prev;
      }

      return {
        pausedAt: startedAt,
        items: prev.items.map((item) => ({
          ...item,
          pausedAt: item.status === "visible" ? startedAt : item.pausedAt,
        })),
      };
    });
  }

  function endPause(): void {
    const endedAt = Date.now();

    store.setState((prev) => {
      if (prev.pausedAt === null) {
        return prev;
      }

      return {
        pausedAt: null,
        items: prev.items.map((item) => {
          if (item.pausedAt === null) {
            return item;
          }

          return {
            ...item,
            pauseDuration: item.pauseDuration + (endedAt - item.pausedAt),
            pausedAt: null,
          };
        }),
      };
    });
  }

  function subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  }

  function getSnapshot(): ReadonlyArray<ToastItem> {
    return store.getState().items;
  }

  function getInitialSnapshot(): ReadonlyArray<ToastItem> {
    return store.getInitialState().items;
  }

  return {
    add,
    update,
    dismiss,
    remove,
    clear,
    updateHeight,
    startPause,
    endPause,
    subscribe,
    getSnapshot,
    getInitialSnapshot,
  };
}
