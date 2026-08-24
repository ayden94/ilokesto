import type { Store } from '@ilokesto/store';
import type { ComputedRef } from 'vue';

import type { ReducerAction } from '../../types/ReduceFn.js';

export type Selector<T, S> = (state: Readonly<T>) => S;
export type SetStateAction<T> = Parameters<Store<T>['setState']>[0];
export type StateWriter<T> = (nextState: SetStateAction<T>) => void;
export type ActionWriter<Action> = (action: Action) => void;

export type VueStateResult<S, T> = Readonly<{
  state: ComputedRef<S>;
  setState: StateWriter<T>;
}>;

export type VueReducerResult<S, Action> = Readonly<{
  state: ComputedRef<S>;
  dispatch: ActionWriter<Action>;
}>;

export type UseState<T> = {
  (): VueStateResult<Readonly<T>, T>;
  <S>(selector: Selector<T, S>): VueStateResult<S, T>;
  writeOnly: () => StateWriter<T>;
  readOnly: {
    (): Readonly<T>;
    <S>(selector: Selector<T, S>): S;
  };
};

export type UseReducer<T, Action extends ReducerAction> = {
  (): VueReducerResult<Readonly<T>, Action>;
  <S>(selector: Selector<T, S>): VueReducerResult<S, Action>;
  writeOnly: () => ActionWriter<Action>;
  readOnly: {
    (): Readonly<T>;
    <S>(selector: Selector<T, S>): S;
  };
};
