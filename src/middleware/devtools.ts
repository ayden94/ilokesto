import type { Store } from '@ilokesto/store';
import { getStoreActionMetadata } from '../lib/actionMetadata';
import { getStore } from '../lib/getStore';
import { registerStoreCleanup } from '../lib/storeCleanup';
import { definePipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeAnyMiddleware, PipeMiddlewareMetadata } from '../utils/pipe/types';

type StoreSetStateAction<T> = Parameters<Store<T>['setState']>[0];

type CurriedDevtools = (<T>(initialState: T | Store<T>) => Store<T>) &
  PipeableMiddleware<
    PipeAnyMiddleware,
    PipeMiddlewareMetadata<'@ilokesto/state/devtools', readonly [], readonly [], 'reject', readonly []>
  >;

type DevtoolsMessage = {
  type: string;
  payload?: {
    type?: string;
  };
  state?: string;
};

type DevtoolsConnection<T> = {
  init: (state: Readonly<T>) => void;
  subscribe: (listener: (message: DevtoolsMessage) => void) => (() => void) | undefined;
  send: (action: string, state: Readonly<T>) => void;
};

type ReduxDevtoolsExtension = {
  connect: <T>(options: { name: string }) => DevtoolsConnection<T>;
};

const getDevtoolsExtension = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as Window & { __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevtoolsExtension })
    .__REDUX_DEVTOOLS_EXTENSION__;
};

const hasInitialState = <T>(value: T | Store<T>): value is Store<T> => {
  return typeof value === 'object' && value !== null && 'getInitialState' in value;
};

const applyDevtools = <T>(initialState: T | Store<T>, name: string) => {
  const store = getStore(initialState);
  const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  const devTools = !isProduction && getDevtoolsExtension()?.connect<T>({ name });

  let isDispatchAction = false;

  if (devTools) {
    devTools.init(store.getState() as T);

    const unsubscribe = devTools.subscribe((message) => {
      if (message.type !== 'DISPATCH') {
        return;
      }

      switch (message.payload?.type) {
        case 'RESET':
          isDispatchAction = true;
          store.setState(
            hasInitialState(initialState)
              ? (initialState.getInitialState() as T)
              : (initialState as T),
          );
          isDispatchAction = false;
          devTools.init(store.getState() as T);
          break;
        case 'COMMIT':
          devTools.init(store.getState() as T);
          break;
        case 'ROLLBACK':
          if (typeof message.state === 'string') {
            isDispatchAction = true;
            store.setState(JSON.parse(message.state) as T);
            isDispatchAction = false;
          }
          break;
        default:
          break;
      }
    });

    if (unsubscribe) {
      registerStoreCleanup(store, unsubscribe);
    }
  }

  store.pushMiddleware((nextState: StoreSetStateAction<T>, next) => {
    next(nextState);

    if (!isProduction && devTools && !isDispatchAction) {
      try {
        const actionType = getStoreActionMetadata(store)?.type ?? 'anonymous action';
        devTools.send(`${name}:${actionType}`, store.getState());
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        console.error('Error sending state to devtools', normalizedError);
      }
    }
  });

  return store;
};

export function devtools<T>(initialState: T | Store<T>, name: string): Store<T>;
export function devtools(name: string): CurriedDevtools;
export function devtools<T>(first: T | Store<T> | string, second?: string) {
  if (arguments.length === 1) {
    const name = first as string;

    return definePipeableMiddleware(
      <State>(initialState: State | Store<State>) => applyDevtools(initialState, name),
      {
        adds: [],
        after: [],
        before: [],
        conflicts: [],
        duplicate: 'reject',
        id: '@ilokesto/state/devtools',
        requires: [],
      } as const,
    );
  }

  return applyDevtools(first as T | Store<T>, second as string);
}
