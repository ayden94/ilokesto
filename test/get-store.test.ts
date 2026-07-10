import { expect, test } from 'bun:test';
import { Store } from '@ilokesto/store';

import { create as createSvelteStore } from '../src/core/Svelte';
import { getStore } from '../src/lib/getStore';
import type { ReduceFn } from '../src/types/ReduceFn';

interface MethodNamedState {
  readonly label: string;
  readonly getState: () => string;
  readonly getInitialState: () => string;
  readonly setState: () => void;
  readonly pushMiddleware: () => void;
  readonly unshiftMiddleware: () => void;
  readonly subscribe: () => void;
}

interface TypedState {
  readonly type: 'ready';
  readonly count: number;
}

interface IncrementAction {
  readonly type: 'increment';
  readonly amount: number;
}

interface CrashAction {
  readonly type: 'crash';
}

type CounterAction = IncrementAction | CrashAction;

test('Given plain state with Store-shaped method names, when getStore receives it, then it wraps the state in a real Store', () => {
  // Given
  const state: MethodNamedState = {
    label: 'plain state',
    getState: () => 'not a Store',
    getInitialState: () => 'not a Store',
    setState: () => undefined,
    pushMiddleware: () => undefined,
    unshiftMiddleware: () => undefined,
    subscribe: () => undefined,
  };

  // When
  const store = getStore(state);

  // Then
  expect(store).toBeInstanceOf(Store);
  expect(store.getState()).toBe(state);
});

test('Given reducer-backed state with a string type field, when it is replaced directly, then the reducer is not invoked', () => {
  // Given
  const store = new Store<TypedState>({ type: 'ready', count: 1 });
  const reducerActions: CounterAction[] = [];
  const reduceTypedState: ReduceFn<TypedState, CounterAction> = (state, action) => {
    reducerActions.push(action);

    if (action.type === 'increment') {
      return { type: 'ready', count: state.count + action.amount };
    }

    throw new Error('reducer exploded');
  };
  const replacement: TypedState = { type: 'ready', count: 9 };
  createSvelteStore(reduceTypedState, store);

  // When
  store.setState(replacement);

  // Then
  expect(store.getState()).toEqual(replacement);
  expect(reducerActions).toEqual([]);
});
