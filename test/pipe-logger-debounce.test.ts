import { expect, jest, spyOn, test } from 'bun:test';
import { Store } from '@ilokesto/store';

import { runWithStoreActionMetadata } from '../src/lib/actionMetadata';
import { debounce, dispose, logger } from '../src/middleware';
import {
  PipeConfigurationError,
  type PipeConfigurationErrorCode,
} from '../src/utils/pipe/errors';
import { getPipeableMiddlewareMetadata } from '../src/utils/pipe/metadata';
import { pipe } from '../src/utils/pipe/index';

type CounterState = {
  readonly count: number;
};

type BunFakeTimerMethod =
  | 'advanceTimersByTime'
  | 'clearAllTimers'
  | 'useFakeTimers'
  | 'useRealTimers';

function callBunFakeTimer(methodName: BunFakeTimerMethod, args: readonly unknown[] = []): void {
  const method: unknown = Reflect.get(jest, methodName);
  if (typeof method !== 'function') {
    throw new TypeError(`Bun fake timer method ${methodName} is unavailable`);
  }

  Reflect.apply(method, jest, args);
}

function usePipe(builder: object, middleware: object): object {
  const use: unknown = Reflect.get(builder, 'use');
  if (typeof use !== 'function') {
    throw new TypeError('Pipe builder must expose use');
  }

  const nextBuilder: unknown = Reflect.apply(use, builder, [middleware]);
  if ((typeof nextBuilder !== 'object' && typeof nextBuilder !== 'function') || nextBuilder === null) {
    throw new TypeError('Pipe builder use must return an object');
  }

  return nextBuilder;
}

function expectPipeConfigurationError(action: () => void, code: PipeConfigurationErrorCode): void {
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

test('Given logger and debounce, when direct and curried forms are used, then it preserves logger and debounce direct and curried contracts', () => {
  // Given
  callBunFakeTimer('useFakeTimers');
  const labels: string[] = [];
  const logs: unknown[][] = [];
  const groupSpy = spyOn(console, 'group').mockImplementation((...args: readonly unknown[]) => {
    labels.push(String(args[0]));
  });
  const groupEndSpy = spyOn(console, 'groupEnd').mockImplementation(() => undefined);
  const logSpy = spyOn(console, 'log').mockImplementation((...args: readonly unknown[]) => {
    logs.push([...args]);
  });

  try {
    const loggerStore = new Store<CounterState>({ count: 0 });
    const debounceStore = new Store<CounterState>({ count: 0 });

    // When
    const directLoggerStore = logger(loggerStore, { timestamp: false });
    runWithStoreActionMetadata(loggerStore, { type: 'increment' }, () => {
      loggerStore.setState((state) => ({ count: state.count + 1 }));
    });
    loggerStore.setState({ count: 2 });
    const directDebounceStore = debounce(debounceStore, 25);
    debounceStore.setState((state) => ({ count: state.count + 1 }));
    debounceStore.setState((state) => ({ count: state.count + 2 }));
    callBunFakeTimer('advanceTimersByTime', [25]);

    // Then
    expect(directLoggerStore).toBe(loggerStore);
    expect(directDebounceStore).toBe(debounceStore);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain('increment');
    expect(labels[1]).toContain('anonymous action');
    expect(debounceStore.getState()).toEqual({ count: 3 });

    const curriedLogger = logger({ timestamp: false });
    const curriedDebounce = debounce(25);
    expect(getPipeableMiddlewareMetadata(curriedLogger)).toEqual({
      adds: [],
      after: [],
      before: [],
      conflicts: [],
      duplicate: 'reject',
      id: '@ilokesto/state/logger',
      requires: [],
    });
    expect(getPipeableMiddlewareMetadata(curriedDebounce)).toEqual({
      adds: [],
      after: [],
      before: [],
      conflicts: [],
      duplicate: 'reject',
      id: '@ilokesto/state/debounce',
      requires: [],
    });

    logs.length = 0;
    const loggerThenDebounce = pipe
      .use(logger({ timestamp: false }))
      .use(debounce(25))
      .create({ count: 0 });
    loggerThenDebounce.setState({ count: 1 });
    expect(logs.map((args) => args[0])).toEqual(['Previous state:', 'Next state:']);
    expect(logs.map((args) => args[1])).toEqual([{ count: 0 }, { count: 0 }]);
    callBunFakeTimer('advanceTimersByTime', [25]);
    expect(loggerThenDebounce.getState()).toEqual({ count: 1 });

    logs.length = 0;
    const debounceThenLogger = pipe
      .use(debounce(25))
      .use(logger({ timestamp: false }))
      .create({ count: 0 });
    debounceThenLogger.setState({ count: 1 });
    expect(logs).toEqual([]);
    callBunFakeTimer('advanceTimersByTime', [25]);
    expect(logs.map((args) => args[0])).toEqual(['Previous state:', 'Next state:']);
    expect(logs.map((args) => args[1])).toEqual([{ count: 0 }, { count: 1 }]);
    expect(debounceThenLogger.getState()).toEqual({ count: 1 });
  } finally {
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
    logSpy.mockRestore();
    callBunFakeTimer('clearAllTimers');
    callBunFakeTimer('useRealTimers');
  }
});

test('Given duplicate logger or debounce pipe middleware, when a chain is built, then it rejects logger and debounce duplicates before effects', () => {
  // Given
  callBunFakeTimer('useFakeTimers');
  const logSpy = spyOn(console, 'log').mockImplementation(() => undefined);
  const timeoutSpy = spyOn(globalThis, 'setTimeout');

  try {
    // When / Then
    expectPipeConfigurationError(
      () => usePipe(usePipe(pipe, logger({ timestamp: false })), logger({ timestamp: false })),
      'DUPLICATE_MIDDLEWARE',
    );
    expectPipeConfigurationError(
      () => usePipe(usePipe(pipe, debounce(25)), debounce(25)),
      'DUPLICATE_MIDDLEWARE',
    );
    callBunFakeTimer('advanceTimersByTime', [25]);
    expect(logSpy).not.toHaveBeenCalled();
    expect(timeoutSpy).not.toHaveBeenCalled();
  } finally {
    timeoutSpy.mockRestore();
    logSpy.mockRestore();
    callBunFakeTimer('clearAllTimers');
    callBunFakeTimer('useRealTimers');
  }
});

test('Given a debounced Store, when timers expire and disposal interrupts later updates, then expiry unregisters cleanup and the Store remains reusable', () => {
  // Given
  callBunFakeTimer('useFakeTimers');
  const store = debounce({ count: 0 }, 25);

  try {
    // When
    store.setState({ count: 1 });
    callBunFakeTimer('advanceTimersByTime', [25]);
    dispose(store);
    store.setState({ count: 2 });
    callBunFakeTimer('advanceTimersByTime', [25]);
    store.setState({ count: 3 });
    dispose(store);
    callBunFakeTimer('advanceTimersByTime', [25]);

    // Then
    expect(store.getState()).toEqual({ count: 2 });

    // When
    store.setState({ count: 4 });
    callBunFakeTimer('advanceTimersByTime', [25]);

    // Then
    expect(store.getState()).toEqual({ count: 4 });
  } finally {
    callBunFakeTimer('clearAllTimers');
    callBunFakeTimer('useRealTimers');
  }
});
