import { test, expect } from 'vitest';

import { FormArrayMutationPlanner } from '../../src/core/array/FormArrayMutationPlanner';

const planner = new FormArrayMutationPlanner();

test('push adds a new item at the end', () => {
  const mutation = planner.push(['a', 'b'], ['k0', 'k1'], 'c', 'k2');

  expect(mutation.values).toEqual(['a', 'b', 'c']);
  expect(mutation.keys).toEqual(['k0', 'k1', 'k2']);
  expect(mutation.mapPreviousIndex(0)).toBe(0);
  expect(mutation.mapPreviousIndex(1)).toBe(1);
  expect(mutation.mapPreviousIndex(2)).toBeUndefined();
});

test('insert places a new item at the requested index', () => {
  const mutation = planner.insert(['a', 'b'], ['k0', 'k1'], 1, 'X', 'k2');

  expect(mutation.values).toEqual(['a', 'X', 'b']);
  expect(mutation.keys).toEqual(['k0', 'k2', 'k1']);
  expect(mutation.mapPreviousIndex(0)).toBe(0);
  expect(mutation.mapPreviousIndex(1)).toBe(2);
  expect(mutation.mapPreviousIndex(2)).toBeUndefined();
});

test('insert clamps index to array bounds', () => {
  const insertAtStart = planner.insert(['a', 'b'], ['k0', 'k1'], -1, 'X', 'k2');
  const insertAtEnd = planner.insert(['a', 'b'], ['k0', 'k1'], 10, 'X', 'k2');

  expect(insertAtStart.values).toEqual(['X', 'a', 'b']);
  expect(insertAtEnd.values).toEqual(['a', 'b', 'X']);
});

test('remove drops item and maps remaining items', () => {
  const mutation = planner.remove(['a', 'b', 'c'], ['k0', 'k1', 'k2'], 1);

  expect(mutation?.values).toEqual(['a', 'c']);
  expect(mutation?.keys).toEqual(['k0', 'k2']);
  expect(mutation?.mapPreviousIndex(0)).toBe(0);
  expect(mutation?.mapPreviousIndex(1)).toBeUndefined();
  expect(mutation?.mapPreviousIndex(2)).toBe(1);
});

test('remove returns undefined for invalid index', () => {
  expect(planner.remove(['a', 'b'], ['k0', 'k1'], -1)).toBeUndefined();
  expect(planner.remove(['a', 'b'], ['k0', 'k1'], 2)).toBeUndefined();
});

test('move shifts item from one index to another', () => {
  const mutation = planner.move(['a', 'b', 'c'], ['k0', 'k1', 'k2'], 1, 0);

  expect(mutation?.values).toEqual(['b', 'a', 'c']);
  expect(mutation?.keys).toEqual(['k1', 'k0', 'k2']);
  expect(mutation?.mapPreviousIndex(0)).toBe(1);
  expect(mutation?.mapPreviousIndex(1)).toBe(0);
  expect(mutation?.mapPreviousIndex(2)).toBe(2);
});

test('move returns undefined for invalid or same index', () => {
  expect(planner.move(['a', 'b'], ['k0', 'k1'], -1, 0)).toBeUndefined();
  expect(planner.move(['a', 'b'], ['k0', 'k1'], 0, 2)).toBeUndefined();
  expect(planner.move(['a', 'b'], ['k0', 'k1'], 0, 0)).toBeUndefined();
});

test('swap exchanges two item positions', () => {
  const mutation = planner.swap(['a', 'b', 'c'], ['k0', 'k1', 'k2'], 0, 2);

  expect(mutation?.values).toEqual(['c', 'b', 'a']);
  expect(mutation?.keys).toEqual(['k2', 'k1', 'k0']);
  expect(mutation?.mapPreviousIndex(0)).toBe(2);
  expect(mutation?.mapPreviousIndex(1)).toBe(1);
  expect(mutation?.mapPreviousIndex(2)).toBe(0);
});

test('swap returns undefined for invalid or same index', () => {
  expect(planner.swap(['a', 'b'], ['k0', 'k1'], -1, 1)).toBeUndefined();
  expect(planner.swap(['a', 'b'], ['k0', 'k1'], 0, 2)).toBeUndefined();
  expect(planner.swap(['a', 'b'], ['k0', 'k1'], 1, 1)).toBeUndefined();
});

test('replace returns new values and keys without previous mapping', () => {
  const mutation = planner.replace(['x', 'y'], ['new0', 'new1']);

  expect(mutation.values).toEqual(['x', 'y']);
  expect(mutation.keys).toEqual(['new0', 'new1']);
  expect(mutation.mapPreviousIndex(0)).toBeUndefined();
  expect(mutation.mapPreviousIndex(1)).toBeUndefined();
});