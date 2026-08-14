import { expect, test } from 'bun:test';
import { join } from 'node:path';

const projectRoot = join(import.meta.dir, '..');
const decoder = new TextDecoder();

test('Given built package exports, when Node imports the public middleware entry, then the import resolves', () => {
  // Given
  const build = Bun.spawnSync({
    cmd: ['pnpm', 'build'],
    cwd: projectRoot,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  // When
  const result = Bun.spawnSync({
    cmd: [
      'node',
      '--input-type=module',
      '--eval',
      "const { throttle } = await import('@ilokesto/state/middleware'); if (typeof throttle !== 'function') throw new TypeError('Expected throttle export'); process.stdout.write('NODE_ESM_PUBLIC_MIDDLEWARE_IMPORT_OK\\n');",
    ],
    cwd: projectRoot,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  // Then
  expect(build.exitCode).toBe(0);
  expect(decoder.decode(build.stderr)).toBe('');
  expect(result.exitCode).toBe(0);
  expect(decoder.decode(result.stderr)).toBe('');
  expect(decoder.decode(result.stdout)).toBe('NODE_ESM_PUBLIC_MIDDLEWARE_IMPORT_OK\n');
}, { timeout: 180_000 });
