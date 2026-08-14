import type { Store } from '@ilokesto/store';

import type { Readable, Subscriber, Unsubscriber, Updater } from 'svelte/store';

import { dispatchStoreAction } from '../../lib/actionMetadata.js';
import type { ReducerAction } from '../../types/ReduceFn.js';
import type {
  ActionWriter,
  Selector,
  UseReducer,
  UseState,
} from './types.js';

const identity = <Value>(value: Value): Value => value;

function createDispatch<T, Action extends ReducerAction>(store: Store<T>): ActionWriter<Action> {
  return (action) => {
    dispatchStoreAction(store, action);
  };
}

function createReadable<T, S>(store: Store<T>, selector: Selector<T, S>): Readable<S> {
  return {
    subscribe(run: Subscriber<S>): Unsubscriber {
      run(selector(store.getState() as T));

      return store.subscribe(() => {
        run(selector(store.getState() as T));
      });
    },
  };
}

export function createStore<T, Action extends ReducerAction>(store: Store<T>, isReduce: boolean) {
  const write = store.setState.bind(store);
  const dispatch = createDispatch<T, Action>(store);
  const subscribe = (run: Subscriber<T>): Unsubscriber => {
    run(store.getState() as T);

    return store.subscribe(() => {
      run(store.getState() as T);
    });
  };
  const select = <S>(selector: Selector<T, S>) => createReadable(store, selector);
  const readOnly = <S = T>(selector?: Selector<T, S>): S => {
    const currentSelector = (selector ?? identity<T>) as Selector<T, S>;
    return currentSelector(store.getState() as T);
  };

  if (isReduce) {
    return {
      subscribe,
      dispatch,
      select,
      writeOnly: () => dispatch,
      readOnly,
    } satisfies UseReducer<T, Action>;
  }

  return {
    subscribe,
    set: (nextState: T) => write(nextState),
    update: (updater: Updater<T>) => write(updater),
    setState: write,
    select,
    writeOnly: () => write,
    readOnly,
  } satisfies UseState<T>;
}
