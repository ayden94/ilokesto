import { test, expect } from 'vitest';

import { ValueHelper } from '../../src/core/value/ValueHelper';
import { FormPath } from '../../src/core/path/FormPath';
import { FormStateInitializer } from '../../src/core/state/FormStateInitializer';

test('getValueAtPath reads nested object values', () => {
  const source = { user: { name: 'Ada', role: 'admin' } };

  expect(ValueHelper.getValueAtPath(source, ['user', 'name'])).toBe('Ada');
  expect(ValueHelper.getValueAtPath(source, ['user', 'role'])).toBe('admin');
});

test('getValueAtPath reads array values', () => {
  const source = { items: ['a', 'b', 'c'] };

  expect(ValueHelper.getValueAtPath(source, ['items', 0])).toBe('a');
  expect(ValueHelper.getValueAtPath(source, ['items', 2])).toBe('c');
});

test('getValueAtPath returns undefined for null or undefined root', () => {
  expect(ValueHelper.getValueAtPath(null, ['value'])).toBeUndefined();
  expect(ValueHelper.getValueAtPath(undefined, ['value'])).toBeUndefined();
});

test('getValueAtPath returns undefined for missing or primitive path', () => {
  const source = { user: { name: 'Ada' } };

  expect(ValueHelper.getValueAtPath(source, ['user', 'age'])).toBeUndefined();
  expect(ValueHelper.getValueAtPath(source, ['user', 'name', 'extra'])).toBeUndefined();
  expect(ValueHelper.getValueAtPath(source, ['unknown', 'path'])).toBeUndefined();
});

test('setValueAtPath writes nested object values immutably', () => {
  const source = { user: { name: 'Ada' } };
  const next = ValueHelper.setValueAtPath(source, ['user', 'name'], 'Grace');

  expect(next).toEqual({ user: { name: 'Grace' } });
  expect(source).toEqual({ user: { name: 'Ada' } });
});

test('setValueAtPath writes array values immutably', () => {
  const source = { items: ['a', 'b', 'c'] };
  const next = ValueHelper.setValueAtPath(source, ['items', 1], 'B');

  expect(next).toEqual({ items: ['a', 'B', 'c'] });
  expect(source).toEqual({ items: ['a', 'b', 'c'] });
});

test('setValueAtPath creates intermediate containers', () => {
  const source = {};
  const nextObjectContainer = ValueHelper.setValueAtPath(source, ['user', 'name'], 'Ada');
  const nextArrayContainer = ValueHelper.setValueAtPath(source, ['items', 0], 'a');

  expect(nextObjectContainer).toEqual({ user: { name: 'Ada' } });
  expect(nextArrayContainer).toEqual({ items: ['a'] });
});

test('setValueAtPath replaces root when path is empty', () => {
  const source = { user: { name: 'Ada' } };
  const next = ValueHelper.setValueAtPath(source, [], { user: { name: 'Grace' } });

  expect(next).toEqual({ user: { name: 'Grace' } });
});

test('getValuesFromFields reconstructs nested values from flat fields', () => {
  const state = FormStateInitializer.initialize({
    user: { name: 'Ada', role: 'admin' },
    items: ['a', 'b'],
  });
  const fieldPaths = Object.fromEntries(
    Object.keys(state.fields).map(key => [key, FormPath.keyToPath(key)]),
  );

  expect(ValueHelper.getValuesFromFields(state, fieldPaths)).toEqual({
    user: { name: 'Ada', role: 'admin' },
    items: ['a', 'b'],
  });
});