import { test, expect } from 'vitest';

import { FormArrayRebaser } from '../../src/core/array/FormArrayRebaser';
import { FormArrayMutationPlanner } from '../../src/core/array/FormArrayMutationPlanner';
import { FormStateStore } from '../../src/core/state/FormStateStore';
import { FormPath } from '../../src/core/path/FormPath';

test('rebase preserves non-array fields', () => {
  const store = new FormStateStore({ email: 'a@example.com', items: [{ name: 'x' }] });
  const planner = new FormArrayMutationPlanner();
  const mutation = planner.push([{ name: 'x' }], ['k0'], { name: 'y' }, 'k1');

  const nextState = FormArrayRebaser.rebase(store, ['items'], mutation.values, mutation.keys, mutation.mapPreviousIndex);

  expect(nextState.fields[FormPath.pathToKey(['email'])]).toMatchObject({ value: 'a@example.com' });
});

test('rebase moves child metadata to new index', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }, { name: 'b' }] });
  const previousKey = FormPath.pathToKey(['items', 1, 'name']);
  store.focusField(previousKey);
  store.touchField(previousKey);
  store.setErrorsByKey(previousKey, [{ message: 'Keep me' }]);

  const planner = new FormArrayMutationPlanner();
  const items = store.getValueAtPath(['items']);
  if (!Array.isArray(items)) throw new TypeError('Expected items to be an array');
  const mutation = planner.move(items, store.getState().arrayKeys[FormPath.pathToKey(['items'])], 1, 0);
  if (mutation === undefined) throw new TypeError('Expected move mutation');

  const nextState = FormArrayRebaser.rebase(store, ['items'], mutation.values, mutation.keys, mutation.mapPreviousIndex);

  const movedField = nextState.fields[FormPath.pathToKey(['items', 0, 'name'])];
  expect(movedField.touched).toBe(true);
  expect(movedField.errors).toEqual([{ message: 'Keep me' }]);
  expect(movedField.isFocused).toBe(true);
});

test('rebase drops metadata for removed items', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }, { name: 'b' }] });
  const previousKey = FormPath.pathToKey(['items', 1, 'name']);
  store.setErrorsByKey(previousKey, [{ message: 'Drop me' }]);

  const planner = new FormArrayMutationPlanner();
  const items = store.getValueAtPath(['items']);
  if (!Array.isArray(items)) throw new TypeError('Expected items to be an array');
  const mutation = planner.remove(items, store.getState().arrayKeys[FormPath.pathToKey(['items'])], 1);
  if (mutation === undefined) throw new TypeError('Expected remove mutation');

  const nextState = FormArrayRebaser.rebase(store, ['items'], mutation.values, mutation.keys, mutation.mapPreviousIndex);

  expect(nextState.fields[FormPath.pathToKey(['items', 0, 'name'])]).toBeDefined();
  expect(nextState.fields[FormPath.pathToKey(['items', 1, 'name'])]).toBeUndefined();
});

test('rebase updates arrayKeys', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }] });
  const planner = new FormArrayMutationPlanner();
  const mutation = planner.replace([{ name: 'x' }, { name: 'y' }], ['new0', 'new1']);

  const nextState = FormArrayRebaser.rebase(store, ['items'], mutation.values, mutation.keys, mutation.mapPreviousIndex);

  expect(nextState.arrayKeys[FormPath.pathToKey(['items'])]).toEqual(['new0', 'new1']);
});

test('rebase preserves submit state from the original state', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }] });
  store.beginSubmit();
  store.completeSubmit(true);

  const planner = new FormArrayMutationPlanner();
  const items = store.getValueAtPath(['items']);
  if (!Array.isArray(items)) throw new TypeError('Expected items to be an array');
  const mutation = planner.push(items, store.getState().arrayKeys[FormPath.pathToKey(['items'])], { name: 'b' }, 'new');

  const nextState = FormArrayRebaser.rebase(store, ['items'], mutation.values, mutation.keys, mutation.mapPreviousIndex);

  expect(nextState.submitCount).toBe(1);
  expect(nextState.isSubmitted).toBe(true);
  expect(nextState.isSubmitSuccessful).toBe(true);
});
