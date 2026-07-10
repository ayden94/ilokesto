import type { Store } from '@ilokesto/store';

import type { ReduceFn, ReducerAction } from '../../types/ReduceFn';
import type { UseReducer, UseState } from './types';
export type { AngularOptions, UseReducer, UseState } from './types';

import { createFrameworkAdapter } from '../shared/createFrameworkAdapter';
import { createUseSignal } from './createUseSignal';

export function create<T, Action extends ReducerAction>(
  reduceFn: ReduceFn<T, Action>,
  initialState: T | Store<T>,
): UseReducer<T, Action>;

export function create<T>(initialState: T | Store<T>): UseState<T>;

export function create<T, Action extends ReducerAction>(
  firstArg: Store<T> | T | ReduceFn<T, Action>,
  secondArg?: T | Store<T>,
) {
  return createFrameworkAdapter(createUseSignal<T, Action>, firstArg, secondArg);
}
