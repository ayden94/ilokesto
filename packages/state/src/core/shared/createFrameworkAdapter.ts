import type { Store } from '@ilokesto/store';

import { getStore } from '../../lib/getStore.js';
import type { ReduceFn, ReducerAction } from '../../types/ReduceFn.js';
import { getInitialState } from './getInitialState.js';

const isReduceFn = <T, Action extends ReducerAction>(
  value: Store<T> | T | ReduceFn<T, Action>,
): value is ReduceFn<T, Action> => {
  return typeof value === 'function';
};

export function createFrameworkAdapter<T, Action extends ReducerAction, Adapter>(
  createAdapter: (store: Store<T>, isReduce: boolean) => Adapter,
  firstArg: Store<T> | T | ReduceFn<T, Action>,
  secondArg?: T | Store<T>,
): Adapter {
  const { initialState, isReduce } = getInitialState(firstArg, secondArg);
  const reduceFn = isReduceFn(firstArg) ? firstArg : undefined;

  return createAdapter(getStore(initialState, reduceFn), isReduce);
}
