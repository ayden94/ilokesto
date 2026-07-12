import type { Store } from '@ilokesto/store';
import { getStore } from '../lib/getStore';
import { registerStoreCleanup } from '../lib/storeCleanup';
import { definePipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeAnyMiddleware, PipeMiddlewareMetadata } from '../utils/pipe/types';

type ThrottlePipeMiddleware = PipeableMiddleware<
  PipeAnyMiddleware,
  PipeMiddlewareMetadata<'@ilokesto/state/throttle', readonly [], readonly [], 'reject', readonly []>
>;

function validateWait(wait: number | undefined): void {
  if (wait !== undefined && (!Number.isFinite(wait) || wait < 0)) {
    throw new RangeError('Throttle wait must be a finite non-negative number');
  }
}

function applyThrottle<T>(initialState: T | Store<T>, wait = 300): Store<T> {
  validateWait(wait);
  const store = getStore(initialState);
  let gateOpen = true;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let unregisterTimeout: (() => void) | null = null;

  store.pushMiddleware((nextState, next) => {
    if (!gateOpen) {
      return;
    }

    gateOpen = false;
    timeout = setTimeout(() => {
      timeout = null;
      gateOpen = true;
      unregisterTimeout?.();
      unregisterTimeout = null;
    }, wait);
    unregisterTimeout = registerStoreCleanup(store, () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }

      timeout = null;
      gateOpen = true;
      unregisterTimeout = null;
    });
    next(nextState);
  });

  return store;
}

export function throttle<T>(initialState: T | Store<T>, wait: number | undefined): Store<T>;
export function throttle(wait?: number): ThrottlePipeMiddleware;
export function throttle<T>(
  ...args: [initialState: T | Store<T>, wait: number | undefined] | [wait?: number]
) {
  if (args.length === 2) {
    return applyThrottle(...args);
  }

  const [wait] = args;
  validateWait(wait);
  const middleware: PipeAnyMiddleware = (initialState) => applyThrottle(initialState, wait);
  return definePipeableMiddleware(middleware, {
    adds: [],
    after: [],
    before: [],
    conflicts: [],
    duplicate: 'reject',
    id: '@ilokesto/state/throttle',
    requires: [],
  } as const);
}
