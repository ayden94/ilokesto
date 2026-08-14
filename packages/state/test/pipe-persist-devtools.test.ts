import { expect, test } from 'bun:test';

import './pipe-devtools-dispose.test';
import './pipe-history-observation.test';
import { MemoryStorage, restoreBrowserGlobal, withBrowserFakes } from './helpers/browserFakes';
import { devtools, persist } from '../src/middleware';
import { PipeConfigurationError, type PipeConfigurationErrorCode } from '../src/utils/pipe/errors';
import { pipe } from '../src/utils/pipe/index';

type CounterState = {
  readonly count: number;
};

const decodeCounter = (value: unknown): CounterState | null => {
  if (typeof value !== 'object' || value === null || !('count' in value)) return null;
  if (typeof value.count !== 'number') return null;
  return { count: value.count };
};

function expectPipeError(action: () => void, code: PipeConfigurationErrorCode): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(PipeConfigurationError);
    if (error instanceof PipeConfigurationError) {
      expect(error.code).toBe(code);
      return;
    }

    throw error;
  }

  throw new TypeError('Expected pipe configuration error');
}

function useAtRuntime(builder: object, middleware: object): object {
  const use = Reflect.get(builder, 'use');
  if (typeof use !== 'function') {
    throw new TypeError('Pipe builder must expose use');
  }

  const nextBuilder = Reflect.apply(use, builder, [middleware]);
  if (typeof nextBuilder !== 'object' || nextBuilder === null) {
    throw new TypeError('Pipe use must return a builder');
  }

  return nextBuilder;
}

test('Given browser fake installation fails after localStorage replacement, when setup unwinds, then it restores the original globals', () => {
  // Given
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDefineProperty = Object.defineProperty;
  originalDefineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
  });
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  originalDefineProperty(globalThis, 'window', {
    configurable: true,
    value: { existing: true },
  });
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const failingDefineProperty: typeof Object.defineProperty = function <T>(
    target: T,
    property: PropertyKey,
    attributes: PropertyDescriptor & ThisType<unknown>,
  ): T {
    if (target === globalThis && property === 'window') {
      throw new TypeError('window installation failed');
    }

    return originalDefineProperty(target, property, attributes);
  };
  try {
    Object.defineProperty = failingDefineProperty;
    try {
      // When / Then
      expect(() => withBrowserFakes(() => undefined)).toThrow('window installation failed');
    } finally {
      Object.defineProperty = originalDefineProperty;
    }

    expect(Object.getOwnPropertyDescriptor(globalThis, 'localStorage')).toEqual(localStorageDescriptor);
    expect(Object.getOwnPropertyDescriptor(globalThis, 'window')).toEqual(windowDescriptor);
  } finally {
    Object.defineProperty = originalDefineProperty;
    restoreBrowserGlobal('localStorage', originalLocalStorageDescriptor);
    restoreBrowserGlobal('window', originalWindowDescriptor);
  }
});

test('Given pre-existing browser globals, when fake-backed work completes, then it restores both descriptors', () => {
  // Given
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
  });
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { existing: true },
  });
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  try {
    // When
    withBrowserFakes(() => undefined);

    // Then
    expect(Object.getOwnPropertyDescriptor(globalThis, 'localStorage')).toEqual(localStorageDescriptor);
    expect(Object.getOwnPropertyDescriptor(globalThis, 'window')).toEqual(windowDescriptor);
  } finally {
    restoreBrowserGlobal('localStorage', originalLocalStorageDescriptor);
    restoreBrowserGlobal('window', originalWindowDescriptor);
  }
});

test('Given persist and devtools via pipe, when they hydrate, write, and receive DevTools commands, then their observable contracts remain unchanged', () => {
  // Given
    withBrowserFakes<CounterState>((storage, connections) => {
    storage.setItem('counter', JSON.stringify({ state: { count: 4 }, version: 0 }));

    const decodeCounter = (value: unknown): CounterState | null => {
      if (typeof value !== 'object' || value === null || !('count' in value)) return null;
      if (typeof value.count !== 'number') return null;
      return { count: value.count };
    };

    // When
    const persisted = pipe.use(persist({ decode: decodeCounter, local: 'counter' })).create({ count: 0 });
    persisted.setState({ count: 6 });
    const instrumented = pipe.use(devtools('counter')).create({ count: 1 });
    const connection = connections[0];
    instrumented.setState({ count: 2 });
    connection.listener?.({ payload: { type: 'RESET' }, type: 'DISPATCH' });
    connection.listener?.({ payload: { type: 'COMMIT' }, type: 'DISPATCH' });
    connection.listener?.({
      payload: { type: 'ROLLBACK' },
      state: JSON.stringify({ count: 8 }),
      type: 'DISPATCH',
    });

    // Then
    expect(persisted.getState()).toEqual({ count: 6 });
    expect(JSON.parse(storage.getItem('counter') ?? '')).toEqual({ state: { count: 6 }, version: 0 });
    expect(storage.reads).toBe(2);
    expect(connection.inits).toEqual([{ count: 1 }, { count: 1 }, { count: 1 }]);
    expect(connection.sends).toEqual([{ action: 'counter:anonymous action', state: { count: 2 } }]);
    expect(instrumented.getState()).toEqual({ count: 8 });
  });
});

test('Given persist and devtools setup permutations via pipe, when each is applied, then hydration and DevTools initialization retain their distinct order', () => {
  // Given
    withBrowserFakes<CounterState>((storage, connections) => {
    storage.setItem('devtools-first', JSON.stringify({ state: { count: 3 }, version: 0 }));
    storage.setItem('persist-first', JSON.stringify({ state: { count: 5 }, version: 0 }));

    // When
    const devtoolsFirst = pipe
      .use(devtools('devtools-first'))
      .use(persist({ decode: decodeCounter, local: 'devtools-first' }))
      .create({ count: 0 });
    const persistFirst = pipe
      .use(persist({ decode: decodeCounter, local: 'persist-first' }))
      .use(devtools('persist-first'))
      .create({ count: 0 });

    // Then
    expect(devtoolsFirst.getState()).toEqual({ count: 3 });
    expect(persistFirst.getState()).toEqual({ count: 5 });
    expect(connections).toHaveLength(2);
    expect(connections[0].inits).toEqual([{ count: 0 }]);
    expect(connections[0].sends).toEqual([
      { action: 'devtools-first:anonymous action', state: { count: 3 } },
    ]);
    expect(connections[1].inits).toEqual([{ count: 5 }]);
    expect(connections[1].sends).toEqual([]);
    expect(storage.reads).toBe(2);
  });
});

test('Given tagged persist and devtools curried forms, when pipe creates both setup permutations, then it preserves persist and devtools setup order', () => {
  // Given
    withBrowserFakes<CounterState>((storage, connections) => {
    storage.setItem('pipe-persist-first', JSON.stringify({ state: { count: 5 }, version: 0 }));
    storage.setItem('pipe-devtools-first', JSON.stringify({ state: { count: 3 }, version: 0 }));

    // When
    const persistFirst = pipe
      .use(persist({ decode: decodeCounter, local: 'pipe-persist-first' }))
      .use(devtools('pipe-persist-first'))
      .create<CounterState>({ count: 0 });
    const devtoolsFirst = pipe
      .use(devtools('pipe-devtools-first'))
      .use(persist({ decode: decodeCounter, local: 'pipe-devtools-first' }))
      .create<CounterState>({ count: 0 });

    // Then
    expect(persistFirst.getState()).toEqual({ count: 5 });
    expect(devtoolsFirst.getState()).toEqual({ count: 3 });
    expect(connections).toHaveLength(2);
    expect(connections[0].inits).toEqual([{ count: 5 }]);
    expect(connections[0].sends).toEqual([]);
    expect(connections[1].inits).toEqual([{ count: 0 }]);
    expect(connections[1].sends).toEqual([
      { action: 'pipe-devtools-first:anonymous action', state: { count: 3 } },
    ]);
    expect(storage.reads).toBe(2);
  });
});

test('Given invalid duplicate curried forms, when pipe validates before persist and devtools side effects, then it rejects without storage or extension setup', () => {
  // Given
    withBrowserFakes<CounterState>((storage, connections) => {
    const duplicatePersist = () =>
      useAtRuntime(
        useAtRuntime(pipe, persist({ decode: decodeCounter, local: 'duplicate-persist' })),
        persist({ decode: decodeCounter, local: 'duplicate-persist' }),
      );
    const duplicateDevtools = () =>
      useAtRuntime(useAtRuntime(pipe, devtools('duplicate-devtools')), devtools('duplicate-devtools'));

    // When / Then
    expectPipeError(duplicatePersist, 'DUPLICATE_MIDDLEWARE');
    expectPipeError(duplicateDevtools, 'DUPLICATE_MIDDLEWARE');
    expect(storage.reads).toBe(0);
    expect(storage.writes).toBe(0);
    expect(connections).toEqual([]);
  });
});

test('Given persistence storage boundaries via pipe, when payloads migrate or are malformed, then migration and eager hydration retain their behavior', () => {
  // Given
    withBrowserFakes<CounterState>((storage) => {
    storage.setItem('migrated', JSON.stringify({ state: { count: 2 }, version: 0 }));
    storage.setItem('malformed', '{');
    const originalConsoleError = console.error;
    const reportedErrors: unknown[][] = [];
    console.error = (...values: unknown[]) => reportedErrors.push(values);

    try {
      // When
      const migrated = pipe.use(persist({
        decode: decodeCounter,
        local: 'migrated',
        migrate: [(state: unknown) => ({ count: (state as CounterState).count + 1 })],
      })).create({ count: 0 });
      const malformed = pipe.use(persist({ decode: decodeCounter, local: 'malformed' })).create({ count: 7 });

      // Then
      expect(migrated.getState()).toEqual({ count: 3 });
      expect(JSON.parse(storage.getItem('migrated') ?? '')).toEqual({ state: { count: 3 }, version: 1 });
      expect(malformed.getState()).toEqual({ count: 7 });
    } finally {
      console.error = originalConsoleError;
    }
  });
});

test('Given devtools production and browser guards, when pipe middleware initializes, then it avoids extension setup', () => {
  // Given
  const initialNodeEnv = process.env.NODE_ENV;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  try {
    // When / Then
    withBrowserFakes<CounterState>((_, connections) => {
      process.env.NODE_ENV = 'production';
      const store = pipe.use(devtools('production')).create<CounterState>({ count: 0 });
      store.setState({ count: 1 });
      expect(connections).toEqual([]);
    });
    Reflect.deleteProperty(globalThis, 'window');
    expect(() => pipe.use(devtools('server')).create<CounterState>({ count: 0 })).not.toThrow();
  } finally {
    if (initialNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = initialNodeEnv;
    }
    restoreBrowserGlobal('window', windowDescriptor);
  }
});
