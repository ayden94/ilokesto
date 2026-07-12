import type { Store } from '@ilokesto/store';
import { getStore } from '../lib/getStore';
import { registerStoreCleanup } from '../lib/storeCleanup';
import { definePipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeAnyMiddleware, PipeMiddlewareMetadata } from '../utils/pipe/types';

type Dispatch<A> = (value: A) => void;
type StoreSetStateAction<T> = Parameters<Store<T>['setState']>[0];

type DebouncePipeMiddleware = PipeableMiddleware<
  PipeAnyMiddleware,
  PipeMiddlewareMetadata<'@ilokesto/state/debounce', readonly [], readonly [], 'reject', readonly []>
>;

const applyDebounce = <T>(initialState: T | Store<T>, wait = 300): Store<T> => {
  const store = getStore(initialState);

  let timeout: NodeJS.Timeout | null = null;
  let updates: Array<StoreSetStateAction<T>> = [];
  let savedNext: Dispatch<StoreSetStateAction<T>> | null = null;
  let unregisterTimeout: (() => void) | null = null;

  store.pushMiddleware((nextState: StoreSetStateAction<T>, next) => {
    updates.push(nextState);
    savedNext = next;

    if (timeout) {
      return;
    }

    timeout = setTimeout(() => {
      let currentState = store.getState() as T;

      updates.forEach((update) => {
        if (typeof update === 'function') {
          currentState = (update as (prev: Readonly<T>) => T)(currentState);
        } else {
          currentState = update;
        }
      });

      const pendingNext = savedNext;
      updates = [];
      timeout = null;
      savedNext = null;
      unregisterTimeout?.();
      unregisterTimeout = null;

      if (pendingNext) {
        pendingNext(currentState);
      }
    }, wait);
    unregisterTimeout = registerStoreCleanup(store, () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = null;
      updates = [];
      savedNext = null;
      unregisterTimeout = null;
    });
  });

  return store;
};

export function debounce<T>(initialState: T | Store<T>, wait: number | undefined): Store<T>;
export function debounce(wait?: number): DebouncePipeMiddleware;
export function debounce<T>(first?: T | Store<T> | number, second?: number) {
  if (arguments.length <= 1) {
    const wait = typeof first === 'number' ? first : undefined;

    const middleware: PipeAnyMiddleware = (initialState) => applyDebounce(initialState, wait);
    return definePipeableMiddleware(middleware, {
      adds: [],
      after: [],
      before: [],
      conflicts: [],
      duplicate: 'reject',
      id: '@ilokesto/state/debounce',
      requires: [],
    } as const);
  }

  return applyDebounce(first as T | Store<T>, second);
}
