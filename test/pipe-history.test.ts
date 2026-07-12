import { expect, test } from 'bun:test';
import { Store } from '@ilokesto/store';

import { history } from '../src/middleware';

test('Given committed states, when history controls replay and branch, then stacks track only changed successful commits', () => {
  // Given
  const baseStore = new Store(0);
  const store = history(baseStore, { limit: 3 });
  const plainStore = history(0, undefined);

  // When / Then
  expect(Object.is(store, baseStore)).toBeTrue();
  plainStore.setState(1);
  plainStore.undo();
  expect(plainStore.getState()).toBe(0);
  expect(store.canUndo()).toBeFalse();
  expect(store.canRedo()).toBeFalse();
  store.undo();
  store.redo();
  store.setState(1);
  store.setState(1);
  store.setState(2);
  store.undo();
  expect(store.getState()).toBe(1);
  store.undo();
  expect(store.getState()).toBe(0);
  store.redo();
  expect(store.getState()).toBe(1);
  store.setState(5);
  expect(store.getState()).toBe(5);
  expect(store.canUndo()).toBeTrue();
  expect(store.canRedo()).toBeFalse();
});

test('Given bounded history limits, when commits exceed capacity, then zero, one, and default limits evict oldest entries', () => {
  // Given
  const disabled = history(new Store(0), { limit: 0 });
  const single = history(new Store(0), { limit: 1 });
  const defaults = history(new Store(0), undefined);

  // When
  disabled.setState(1);
  single.setState(1);
  single.setState(2);
  for (let value = 1; value <= 301; value += 1) {
    defaults.setState(value);
  }
  single.undo();
  for (let count = 0; count < 300; count += 1) {
    defaults.undo();
  }

  // Then
  expect(disabled.canUndo()).toBeFalse();
  disabled.undo();
  expect(disabled.getState()).toBe(1);
  expect(single.getState()).toBe(1);
  expect(single.canUndo()).toBeFalse();
  single.redo();
  expect(single.getState()).toBe(2);
  expect(defaults.getState()).toBe(1);
  expect(defaults.canUndo()).toBeFalse();
});

test('Given a changed stack, when an updater throws or history clears, then failed work is absent and clear leaves state unchanged', () => {
  // Given
  const store = history(new Store(0), { limit: 2 });
  const failure = new TypeError('updater failed');
  store.setState(1);

  // When / Then
  expect(() => store.setState(() => {
    throw failure;
  })).toThrow(failure);
  store.undo();
  expect(store.getState()).toBe(0);
  expect(store.canUndo()).toBeFalse();
  expect(store.canRedo()).toBeTrue();
  store.clearHistory();
  expect(store.getState()).toBe(0);
  expect(store.canUndo()).toBeFalse();
  expect(store.canRedo()).toBeFalse();
  store.undo();
  store.redo();
  expect(store.getState()).toBe(0);
});
