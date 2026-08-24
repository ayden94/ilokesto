import { SetStateAction } from 'react';

import type { ReducerAction } from '../../types/ReduceFn.js';

/**
 * React hook returned by `create()` for plain state.
 */
export type UseState<T> = {
  (): readonly [Readonly<T>, (nextState: SetStateAction<T>) => void];
  <S>(selector: (state: Readonly<T>) => S): readonly [S, (nextState: SetStateAction<T>) => void];
  writeOnly: () => (nextState: SetStateAction<T>) => void;
  readOnly: {
    (): Readonly<T>;
    <S>(selector: (state: Readonly<T>) => S): S;
  };
};

/**
 * React hook returned by `create()` for reducer state.
 */
export type UseReducer<T, Action extends ReducerAction> = {
  (): readonly [Readonly<T>, (action: Action) => void];
  <S>(selector: (state: Readonly<T>) => S): readonly [S, (action: Action) => void];
  writeOnly: () => (action: Action) => void;
  readOnly: {
    (): Readonly<T>;
    <S>(selector: (state: Readonly<T>) => S): S;
  };
};
