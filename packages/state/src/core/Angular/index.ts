import type { Store } from '@ilokesto/store';

import type { ReduceFn, ReducerAction } from '../../types/ReduceFn.js';
import type { UseReducer, UseState } from './types.js';
export type { AngularOptions, UseReducer, UseState } from './types.js';

import { createFrameworkAdapter } from '../shared/createFrameworkAdapter.js';
import { createUseSignal } from './createUseSignal.js';

export function create<T, Action extends ReducerAction>(
  reduceFn: ReduceFn<T, Action>,
  initialState: T | Store<T>,
): UseReducer<T, Action>;

export function create<T>(initialState: T | Store<T>): UseState<T>;

/**
 * Create an Angular signal from plain state or a reducer.
 *
 * Returns a function that must be called inside an injection context or with
 * an explicit `{ destroyRef }`. Returns `{ state, setState, subscribe }` or
 * `{ state, dispatch, subscribe }`. Selectors and `.readOnly()` receive
 * `Readonly<T>` snapshots; use `.writeOnly()` for lifecycle-independent updates.
 */
export function create<T, Action extends ReducerAction>(
  firstArg: Store<T> | T | ReduceFn<T, Action>,
  secondArg?: T | Store<T>,
) {
  return createFrameworkAdapter(
    createUseSignal<T, Action>,
    { firstArg, secondArg, isReduce: arguments.length === 2 },
  );
}
