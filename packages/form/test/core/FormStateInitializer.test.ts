import { test, expect } from 'vitest';

import { FormStateInitializer } from '../../src/core/state/FormStateInitializer';
import { FormPath } from '../../src/core/path/FormPath';

test('initialize with primitive values creates leaf fields', () => {
  const state = FormStateInitializer.initialize({ name: 'Ada', count: 42, active: true });

  expect(state.fields[FormPath.pathToKey(['name'])]).toEqual({
    value: 'Ada',
    errors: [],
    touched: false,
    dirty: false,
    modified: false,
    isFocused: false,
  });
  expect(state.fields[FormPath.pathToKey(['count'])]).toMatchObject({ value: 42 });
  expect(state.fields[FormPath.pathToKey(['active'])]).toMatchObject({ value: true });
  expect(state.arrayKeys).toEqual({});
});

test('initialize with nested objects creates nested leaf fields', () => {
  const state = FormStateInitializer.initialize({
    user: { name: 'Ada', profile: { role: 'admin' } },
  });

  expect(state.fields[FormPath.pathToKey(['user', 'name'])]).toMatchObject({ value: 'Ada' });
  expect(state.fields[FormPath.pathToKey(['user', 'profile', 'role'])]).toMatchObject({ value: 'admin' });
  expect(state.arrayKeys).toEqual({});
});

test('initialize with arrays generates arrayKeys and nested fields', () => {
  const state = FormStateInitializer.initialize({
    items: [{ name: 'a' }, { name: 'b' }],
  });

  expect(state.arrayKeys[FormPath.pathToKey(['items'])]).toEqual(['initial-0', 'initial-1']);
  expect(state.fields[FormPath.pathToKey(['items', 0, 'name'])]).toMatchObject({ value: 'a' });
  expect(state.fields[FormPath.pathToKey(['items', 1, 'name'])]).toMatchObject({ value: 'b' });
});

test('initialize with mixed null and undefined preserves leaf values', () => {
  const state = FormStateInitializer.initialize({
    maybeNull: null,
    maybeUndefined: undefined,
    nested: { maybeNull: null },
  });

  expect(state.fields[FormPath.pathToKey(['maybeNull'])]).toMatchObject({ value: null });
  expect(state.fields[FormPath.pathToKey(['maybeUndefined'])]).toMatchObject({ value: undefined });
  expect(state.fields[FormPath.pathToKey(['nested', 'maybeNull'])]).toMatchObject({ value: null });
});

test('initialize records defaultValues and default submit state', () => {
  const defaultValues = { name: 'Ada' };
  const state = FormStateInitializer.initialize(defaultValues);

  expect(state.defaultValues).toEqual(defaultValues);
  expect(state.submitCount).toBe(0);
  expect(state.isSubmitting).toBe(false);
  expect(state.isSubmitted).toBe(false);
  expect(state.isSubmitSuccessful).toBe(false);
});