import type { Store } from '@ilokesto/store';
import { useMemo, useSyncExternalStore } from 'react';

import { dispatchStoreAction } from '../../lib/actionMetadata';
import type { ReducerAction } from '../../types/ReduceFn';
import { deepCompare } from '../shared/deepCompare';
import type { UseReducer, UseState } from './types';

type Selector<T, S> = (state: T) => S;

const identity = <Value>(value: Value): Value => value;

export function useStoreState<T, S, Writer>(
  store: Store<T>,
  selector: (state: T) => S,
  write: Writer,
) {
  const subscribe = useMemo(() => store.subscribe.bind(store), [store]);

  const { getSnapshot, getServerSnapshot } = useMemo(() => {
    let hasMemo = false;
    let mStore: T | undefined;
    let mSelection: S | undefined;

    const mSelector = (nStore: T): S => {
      if (!hasMemo) {
        hasMemo = true;
        mStore = nStore;
        const nSelection = selector(nStore);
        mSelection = nSelection;
        return nSelection;
      }

      const pStore = mStore as T;
      const pSelection = mSelection as S;

      if (deepCompare(pStore, nStore)) return pSelection;

      const nSelection = selector(nStore);

      mStore = nStore;
      mSelection = nSelection;
      return nSelection;
    };

    return {
      getSnapshot: () => mSelector(store.getState()),
      getServerSnapshot: () => mSelector(store.getInitialState()),
    };
  }, [store, selector]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return [value, write] as const;
}

export function createUseState<T, Action extends ReducerAction>(
  store: Store<T>,
  isReduce: boolean,
): UseState<T> | UseReducer<T, Action> {
  const write = store.setState.bind(store);
  const dispatch = (action: Action): void => dispatchStoreAction(store, action);

  function readOnly(): T;
  function readOnly<S>(selector: Selector<T, S>): S;
  function readOnly<S>(selector?: Selector<T, S>) {
    const currentState = store.getState();

    return selector ? selector(currentState) : currentState;
  }

  function createUseSelectedState<Writer>(writer: Writer) {
    function useSelectedState(): readonly [T, Writer];
    function useSelectedState<S>(selector: Selector<T, S>): readonly [S, Writer];
    function useSelectedState(selector?: Selector<T, unknown>) {
      const select = selector ?? identity<T>;

      return useStoreState(store, select, writer);
    }

    return useSelectedState;
  }

  if (isReduce) {
    return Object.assign(createUseSelectedState(dispatch), {
      writeOnly: () => dispatch,
      readOnly,
    }) satisfies UseReducer<T, Action>;
  }

  return Object.assign(createUseSelectedState(write), {
    writeOnly: () => write,
    readOnly,
  }) satisfies UseState<T>;
}
