import { expect, test } from 'bun:test';
import { join } from 'node:path';

const projectRoot = join(import.meta.dir, '..');

test('Given pipe type fixtures, when their compiler configs are listed, then only the shared fixture and test configs remain', () => {
  // Given / When
  const configs = [
    ...new Bun.Glob('test/**/tsconfig.json').scanSync({ cwd: projectRoot }),
  ].sort();

  // Then
  expect(configs).toEqual([
    'test/fixtures/pipe-types/tsconfig.json',
    'test/tsconfig.json',
  ]);
});
