import { expect, test } from 'bun:test';

import { persist } from '../src/middleware';
import { pipe } from '../src/utils/pipe';
import { withBrowserFakes } from './helpers/browserFakes';

type CounterState = {
  readonly count: number;
};

const decodeCounter = (value: unknown): CounterState | null => {
  if (typeof value !== 'object' || value === null || !('count' in value)) return null;
  if (typeof value.count === 'number') return { count: value.count };
  if (typeof value.count === 'string' && value.count === '4') return { count: 4 };
  return null;
};

test('Given current safe local, cookie, and session payloads, when persist hydrates, then each decoder supplies state without setup writes', () => {
  // Given
  withBrowserFakes<CounterState>((localStorage, _, browserStorage) => {
    const encoded = JSON.stringify({ state: { count: '4' }, version: 0 });
    localStorage.setItem('safe-current-local', encoded);
    browserStorage.sessionStorage.setItem('safe-current-session', encoded);
    browserStorage.cookieDocument.cookie = `safe-current-cookie=${encoded}`;
    localStorage.writes = 0;
    browserStorage.sessionStorage.writes = 0;
    browserStorage.cookieDocument.writes = 0;

    // When
    const local = persist({ count: 0 }, { decode: decodeCounter, local: 'safe-current-local' });
    const session = persist(
      { count: 0 },
      { decode: decodeCounter, session: 'safe-current-session' },
    );
    const cookie = persist(
      { count: 0 },
      { cookie: 'safe-current-cookie', decode: decodeCounter },
    );

    // Then
    expect(local.getState()).toEqual({ count: 4 });
    expect(session.getState()).toEqual({ count: 4 });
    expect(cookie.getState()).toEqual({ count: 4 });
    expect(localStorage.writes).toBe(0);
    expect(browserStorage.sessionStorage.writes).toBe(0);
    expect(browserStorage.cookieDocument.writes).toBe(0);
  });
});

test('Given a safe V0 payload and two migrations, when the final candidate decodes, then setup hydrates and rewrites decoded V2 exactly once', () => {
  // Given
  withBrowserFakes<CounterState>((storage) => {
    storage.setItem('safe-old', JSON.stringify({ state: { legacyCount: 3 }, version: 0 }));
    storage.writes = 0;
    const calls: string[] = [];

    // When
    const store = persist(
      { count: 0 },
      {
        decode: decodeCounter,
        local: 'safe-old',
        migrate: [
          (value: unknown) => {
            calls.push('v1');
            return { text: JSON.stringify(value) };
          },
          (value: { readonly text: string }) => {
            calls.push('v2');
            return { count: value.text.length > 0 ? 4 : 0 };
          },
        ],
      },
    );

    // Then
    expect(calls).toEqual(['v1', 'v2']);
    expect(store.getState()).toEqual({ count: 4 });
    expect(storage.writes).toBe(1);
    expect(JSON.parse(storage.getItem('safe-old') ?? '')).toEqual({
      state: { count: 4 },
      version: 2,
    });
  });
});

test('Given safe current hydration, when the Store later changes, then only the later state is persisted', () => {
  // Given
  withBrowserFakes<CounterState>((storage) => {
    storage.setItem('safe-later', JSON.stringify({ state: { count: 2 }, version: 0 }));
    storage.writes = 0;
    const store = persist({ count: 0 }, { decode: decodeCounter, local: 'safe-later' });

    // When
    store.setState({ count: 9 });

    // Then
    expect(storage.writes).toBe(1);
    expect(JSON.parse(storage.getItem('safe-later') ?? '')).toEqual({
      state: { count: 9 },
      version: 0,
    });
  });
});

test('Given legacy direct and curried persistence, when hydration and migration run, then eager legacy behavior remains unchanged', () => {
  // Given
  withBrowserFakes<CounterState>((storage) => {
    storage.setItem('legacy-direct', JSON.stringify({ state: { count: 1 }, version: 0 }));
    storage.setItem('legacy-curried', JSON.stringify({ state: { count: 2 }, version: 0 }));
    storage.setItem('legacy-migrate', JSON.stringify({ state: { count: 3 }, version: 0 }));
    storage.writes = 0;

    // When
    const direct = persist({ count: 0 }, { local: 'legacy-direct' });
    const curried = pipe.use(persist({ local: 'legacy-curried' })).create<CounterState>({ count: 0 });
    const migrated = persist(
      { count: 0 },
      { local: 'legacy-migrate', migrate: [(state: CounterState) => ({ count: state.count + 1 })] },
    );

    // Then
    expect(direct.getState()).toEqual({ count: 1 });
    expect(curried.getState()).toEqual({ count: 2 });
    expect(migrated.getState()).toEqual({ count: 4 });
    expect(storage.writes).toBe(1);
    expect(JSON.parse(storage.getItem('legacy-migrate') ?? '')).toEqual({
      state: { count: 4 },
      version: 1,
    });
  });
});
