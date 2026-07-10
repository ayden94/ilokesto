import type { Store } from '@ilokesto/store';
import type { Readable, Writable } from 'svelte/store';

import type { ReducerAction } from '../../types/ReduceFn';

export type Selector<T, S> = (state: T) => S;
export type SetStateAction<T> = Parameters<Store<T>['setState']>[0];
export type StateWriter<T> = (nextState: SetStateAction<T>) => void;
export type ActionWriter<Action> = (action: Action) => void;

export type SvelteReadable<S> = Readable<S>;

export type SvelteStateStore<T> = Writable<T> & {
  setState: StateWriter<T>;
  select: <S>(selector: Selector<T, S>) => SvelteReadable<S>;
  writeOnly: () => StateWriter<T>;
  readOnly: {
    (): T;
    <S>(selector: Selector<T, S>): S;
  };
};

export type SvelteReducerStore<T, Action extends ReducerAction> = Readable<T> & {
  dispatch: ActionWriter<Action>;
  select: <S>(selector: Selector<T, S>) => SvelteReadable<S>;
  writeOnly: () => ActionWriter<Action>;
  readOnly: {
    (): T;
    <S>(selector: Selector<T, S>): S;
  };
};

export type UseState<T> = SvelteStateStore<T>;
export type UseReducer<T, Action extends ReducerAction> = SvelteReducerStore<T, Action>;
