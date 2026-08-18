import type { DisplayOptions, OverlayItem, OverlayStoreApi } from '@ilokesto/overlay';
import type { ModalCloseHandler } from './types';

function getModalCloseHandler(item: OverlayItem): ModalCloseHandler<unknown> | undefined {
  const onModalClose = item.props.onModalClose;

  return typeof onModalClose === 'function'
    ? onModalClose as ModalCloseHandler<unknown>
    : undefined;
}

export function createModalLifecycleStore(store: OverlayStoreApi): OverlayStoreApi {
  const notifiedModalIds = new Set<string>();

  function notifyModalClose<TResult>(
    id: string,
    onModalClose: ModalCloseHandler<TResult> | undefined,
    result?: TResult
  ) {
    if (notifiedModalIds.has(id)) {
      return;
    }

    notifiedModalIds.add(id);
    onModalClose?.(result);
  }

  function notifyModalItemClose(item: OverlayItem | undefined, result?: unknown) {
    if (!item || item.type !== 'modal') {
      return;
    }

    notifyModalClose(item.id, getModalCloseHandler(item), result);
  }

  function notifyModalItemsClose(items: ReadonlyArray<OverlayItem>) {
    for (const item of items) {
      notifyModalItemClose(item, item.closeResult);
    }
  }

  return {
    open: <TResult = unknown>(options: DisplayOptions) => {
      // A duplicate open for an already-pending id must not reset its close
      // notification, otherwise a later close/remove can fire twice.
      const existingId = typeof options.id === 'string'
        ? store.getSnapshot().some((item) => item.id === options.id)
        : false;
      const request = store.open<TResult>(options);

      if (!existingId) {
        notifiedModalIds.delete(request.id);
      }

      return request;
    },
    close: (id, result) => {
      const item = store.getSnapshot().find((candidate) => candidate.id === id);

      notifyModalItemClose(item, result);
      store.close(id, result);
    },
    closeAll: () => {
      store.closeAll();
    },
    reject: (id, reason) => {
      const item = store.getSnapshot().find((candidate) => candidate.id === id);

      notifyModalItemClose(item, undefined);
      store.reject(id, reason);
    },
    remove: (id) => {
      const items = store.getSnapshot();
      const targetId = id ?? items[items.length - 1]?.id;
      const item = targetId
        ? items.find((candidate) => candidate.id === targetId)
        : undefined;

      notifyModalItemClose(item, item?.closeResult);
      store.remove(id);

      if (targetId) {
        notifiedModalIds.delete(targetId);
      }
    },
    clear: () => {
      const items = store.getSnapshot();

      notifyModalItemsClose(items);
      store.clear();

      for (const item of items) {
        notifiedModalIds.delete(item.id);
      }
    },
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    getInitialSnapshot: store.getInitialSnapshot,
  };
}