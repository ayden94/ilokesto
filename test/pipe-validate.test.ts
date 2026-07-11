import { expect, test } from 'bun:test';
import { Store } from '@ilokesto/store';

import { validate } from '../src/middleware/validate';
import { PipeConfigurationError } from '../src/utils/pipe/errors';
import { pipe } from '../src/utils/pipe';

type CounterState = {
  readonly count: number;
};

function isCounterState(value: unknown): value is CounterState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'count' in value &&
    typeof value.count === 'number'
  );
}

const counterSchema = {
  '~standard': {
    validate: (value: unknown) =>
      isCounterState(value) && value.count >= 0
        ? { value }
        : { issues: [{ message: 'count must be a non-negative number' }] },
    vendor: 'test',
    version: 1 as const,
  },
} as const;

const asyncCounterSchema = {
  '~standard': {
    validate: async (value: unknown) =>
      isCounterState(value)
        ? { value }
        : { issues: [{ message: 'count must be a number' }] },
    vendor: 'test',
    version: 1 as const,
  },
} as const;

test('Given direct and pipe validate middleware, when valid state is applied, then it preserves validate direct and pipe contracts', () => {
  // Given
  const directInput = new Store<CounterState>({ count: 0 });
  const directStore = validate(directInput, counterSchema);
  const pipeStore = pipe.use(validate(counterSchema)).create({ count: 0 });

  // When
  directStore.setState((previous) => ({ count: previous.count + 1 }));
  pipeStore.setState((previous) => ({ count: previous.count + 1 }));

  // Then
  expect(directStore).toBe(directInput);
  expect(directStore.getState()).toEqual({ count: 1 });
  expect(pipeStore.getState()).toEqual({ count: 1 });
});

test('Given direct and pipe validate middleware, when an update is invalid or async, then it leaves the Store state unchanged', () => {
  // Given
  const directStore = validate({ count: 1 }, counterSchema);
  const asyncStore = validate({ count: 1 }, asyncCounterSchema);
  const pipeStore = pipe.use(validate(counterSchema)).create({ count: 1 });

  // When
  directStore.setState({ count: -1 });
  asyncStore.setState({ count: 2 });
  pipeStore.setState({ count: -1 });

  // Then
  expect(directStore.getState()).toEqual({ count: 1 });
  expect(asyncStore.getState()).toEqual({ count: 1 });
  expect(pipeStore.getState()).toEqual({ count: 1 });
});

test('Given curried validate middleware, when it is appended twice, then it rejects the duplicate before Store creation', () => {
  // Given
  const builder = pipe.use(validate(counterSchema));
  const appendDuplicate = () => Reflect.apply(builder.use, builder, [validate(counterSchema)]);

  // When / Then
  expect(appendDuplicate).toThrow(PipeConfigurationError);
  expect(appendDuplicate).toThrow(
    expect.objectContaining({ code: 'DUPLICATE_MIDDLEWARE', ids: ['@ilokesto/state/validate'] }),
  );
});
