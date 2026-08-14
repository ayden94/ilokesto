import { expect, test } from 'bun:test';

import { persist } from '../src/middleware';
import { pipe } from '../src/utils/pipe';
import { nonFunctionMigrations, sparseMigrations } from './fixtures/persist-corrupted-migrations.js';
import { withBrowserFakes } from './helpers/browserFakes';

type CounterState = {
  readonly count: number;
};

const invalidPayloads = [
  ['malformed JSON', '{'],
  ['null envelope', 'null'],
  ['array envelope', '[]'],
  ['missing state', JSON.stringify({ version: 0 })],
  ['missing version', JSON.stringify({ state: { count: 5 } })],
  ['negative version', JSON.stringify({ state: { count: 5 }, version: -1 })],
  ['fractional version', JSON.stringify({ state: { count: 5 }, version: 0.5 })],
  ['NaN-equivalent version', JSON.stringify({ state: { count: 5 }, version: Number.NaN })],
  ['non-number version', JSON.stringify({ state: { count: 5 }, version: '0' })],
  ['future version', JSON.stringify({ state: { count: 5 }, version: 2 })],
] as const;

for (const [label, encoded] of invalidPayloads) {
  test(`Given a ${label}, when safe persist reads it, then migration and decode are skipped with zero setup writes`, () => {
    // Given
    withBrowserFakes<CounterState>((storage) => {
      const key = `safe-invalid-${label}`;
      storage.setItem(key, encoded);
      storage.writes = 0;
      let migrationCalls = 0;
      let decodeCalls = 0;

      // When
      const store = pipe.use(persist({
          decode: () => {
            decodeCalls += 1;
            return { count: 99 };
          },
          local: key,
          migrate: [() => {
            migrationCalls += 1;
            return { count: 88 };
          }],
        })).create({ count: 7 });

      // Then
      expect(store.getState()).toEqual({ count: 7 });
      expect(migrationCalls).toBe(0);
      expect(decodeCalls).toBe(0);
      expect(storage.writes).toBe(0);
    });
  });
}

test('Given an empty safe migration tuple and V1 storage, when persist hydrates, then it rejects the future version before decode', () => {
  // Given
  withBrowserFakes<CounterState>((storage) => {
    storage.setItem('safe-empty-future', JSON.stringify({ state: { count: 5 }, version: 1 }));
    storage.writes = 0;
    let decodeCalls = 0;

    // When
    const store = pipe.use(persist({
        decode: () => {
          decodeCalls += 1;
          return { count: 5 };
        },
        local: 'safe-empty-future',
        migrate: [],
      })).create({ count: 7 });

    // Then
    expect(store.getState()).toEqual({ count: 7 });
    expect(decodeCalls).toBe(0);
    expect(storage.writes).toBe(0);
  });
});

for (const [label, migrations] of [
  ['sparse', sparseMigrations],
  ['non-function', nonFunctionMigrations],
] as const) {
  test(`Given ${label} required migration slots from JavaScript, when safe persist hydrates, then it rejects before decode and write`, () => {
    // Given
    withBrowserFakes<CounterState>((storage) => {
      const key = `safe-${label}-migration`;
      storage.setItem(key, JSON.stringify({ state: { count: 5 }, version: 1 }));
      storage.writes = 0;
      let decodeCalls = 0;

      // When
      const store = pipe.use(persist({
          decode: () => {
            decodeCalls += 1;
            return { count: 5 };
          },
          local: key,
          migrate: migrations,
        })).create({ count: 7 });

      // Then
      expect(store.getState()).toEqual({ count: 7 });
      expect(decodeCalls).toBe(0);
      expect(storage.writes).toBe(0);
    });
  });
}

test('Given a throwing migration, when safe persist hydrates, then decode is skipped and setup remains unchanged', () => {
  // Given
  withBrowserFakes<CounterState>((storage) => {
    storage.setItem('safe-migration-throw', JSON.stringify({ state: { count: 5 }, version: 0 }));
    storage.writes = 0;
    let decodeCalls = 0;

    // When
    const store = pipe.use(persist({
        decode: () => {
          decodeCalls += 1;
          return { count: 5 };
        },
        local: 'safe-migration-throw',
        migrate: [() => {
          throw new TypeError('migration failed');
        }],
      })).create({ count: 7 });

    // Then
    expect(store.getState()).toEqual({ count: 7 });
    expect(decodeCalls).toBe(0);
    expect(storage.writes).toBe(0);
  });
});

test('Given a successful old migration and null decode, when safe persist hydrates, then the candidate is not rewritten', () => {
  // Given
  withBrowserFakes<CounterState>((storage) => {
    storage.setItem('safe-old-decode-null', JSON.stringify({ state: { count: 5 }, version: 0 }));
    storage.writes = 0;
    let decodedCandidate: unknown;
    const decodeCandidate = (candidate: unknown): CounterState | null => {
      decodedCandidate = candidate;
      return null;
    };

    // When
    const store = pipe.use(persist({
        decode: decodeCandidate,
        local: 'safe-old-decode-null',
        migrate: [(state: unknown) => ({ candidate: state })],
      })).create({ count: 7 });

    // Then
    expect(decodedCandidate).toEqual({ candidate: { count: 5 } });
    expect(store.getState()).toEqual({ count: 7 });
    expect(storage.writes).toBe(0);
  });
});

const decodeNull: (value: unknown) => CounterState | null = () => null;
const decodeThrow: (value: unknown) => CounterState | null = () => {
  throw new TypeError('decode failed');
};
const decoderRejections: ReadonlyArray<
  readonly [string, (value: unknown) => CounterState | null]
> = [
  ['null', decodeNull],
  ['throwing', decodeThrow],
];

for (const [label, decode] of decoderRejections) {
  test(`Given a ${label} decoder result, when safe current persistence hydrates, then initial state remains with zero writes`, () => {
    // Given
    withBrowserFakes<CounterState>((storage) => {
      const key = `safe-decode-${label}`;
      storage.setItem(key, JSON.stringify({ state: { count: 5 }, version: 0 }));
      storage.writes = 0;

      // When
      const store = pipe.use(persist({ decode, local: key })).create({ count: 7 });

      // Then
      expect(store.getState()).toEqual({ count: 7 });
      expect(storage.writes).toBe(0);
    });
  });
}
