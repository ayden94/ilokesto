import { test, expect } from 'vitest';

import { FormPath } from '../../src/core/path/FormPath';

test('pathToKey returns root key for empty path', () => {
  expect(FormPath.pathToKey([])).toBe('$');
});

test('pathToKey returns JSON string for single segment path', () => {
  expect(FormPath.pathToKey(['email'])).toBe('["email"]');
});

test('pathToKey returns JSON string for multi segment path', () => {
  expect(FormPath.pathToKey(['user', 'name'])).toBe('["user","name"]');
});

test('pathToKey handles array index segments', () => {
  expect(FormPath.pathToKey(['items', 0, 'name'])).toBe('["items",0,"name"]');
});

test('keyToPath round-trips paths through JSON string', () => {
  const paths = [
    [],
    ['email'],
    ['user', 'name'],
    ['items', 0, 'name'],
  ];

  paths.forEach(path => {
    expect(FormPath.keyToPath(FormPath.pathToKey(path))).toEqual(path);
  });
});

test('keyToPath converts root key to empty path', () => {
  expect(FormPath.keyToPath('$')).toEqual([]);
});

test('pathInputToKey converts string path to single segment key', () => {
  expect(FormPath.pathInputToKey('user.name')).toBe('["user.name"]');
});

test('pathInputToKey converts tuple path to key', () => {
  expect(FormPath.pathInputToKey(['user', 'name'])).toBe('["user","name"]');
});

test('toFieldPath converts string to single segment tuple', () => {
  expect(FormPath.toFieldPath('user.name')).toEqual(['user.name']);
});

test('toFieldPath passes tuple path through', () => {
  expect(FormPath.toFieldPath(['user', 'name'])).toEqual(['user', 'name']);
});

test('path helper returns segments as tuple', () => {
  expect(FormPath.path('user', 'name')).toEqual(['user', 'name']);
});