import type { DisplayOptions, OverlayItem, OverlayStoreApi } from '@ilokesto/overlay';
import type { ModalCloseHandler } from './types';

const notifiedModalIds = new Set<string>();

function resetModalCloseNotification(id?: string) {
  if (id) {
    notifiedModalIds.delete(id);
  }
}

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

function getModalCloseHandler(item: OverlayItem): ModalCloseHandler<unknown> | undefined {
  const onModalClose = item.props.onModalClose;

  return typeof onModalClose === 'function'
    ? onModalClose as ModalCloseHandler<unknown>
    : undefined;
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

export function createModalLifecycleStore(store: OverlayStoreApi): OverlayStoreApi {
  return {
    open: <TResult = unknown>(options: DisplayOptions) => {
      const request = store.open<TResult>(options);
      resetModalCloseNotification(request.id);

      return request;
    },
    close: (id, result) => {
      const item = store.getSnapshot().find((candidate) => candidate.id === id);

      notifyModalItemClose(item, result);
      store.close(id, result);
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
        resetModalCloseNotification(targetId);
      }
    },
    clear: () => {
      const items = store.getSnapshot();

      notifyModalItemsClose(items);
      store.clear();

      for (const item of items) {
        resetModalCloseNotification(item.id);
      }
    },
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    getInitialSnapshot: store.getInitialSnapshot,
  };
}
