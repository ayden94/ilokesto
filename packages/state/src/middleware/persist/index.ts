import { Store } from '@ilokesto/store';
import { getStore } from '../../lib/getStore.js';
import { definePipeableMiddleware } from '../../utils/pipe/metadata.js';
import type { PipeableMiddleware } from '../../utils/pipe/metadata.js';
import type {
  PipeMiddleware,
  PipeMiddlewareMetadata,
} from '../../utils/pipe/types.js';
import type {
  MigrationFn,
  SafePersistConfig,
} from './Persist.js';
import { getSafeStorage, parseOptions, setStorage } from './persistUtils.js';

type PersistMetadata = PipeMiddlewareMetadata<
  '@ilokesto/state/persist',
  readonly [],
  readonly [],
  'reject',
  readonly []
>;

type SafeCurriedPersist<State> = PipeableMiddleware<
  PipeMiddleware<State>,
  PersistMetadata,
  'persist-decoder'
>;

const applyPersist = <T>(
  initialState: T | Store<T>,
  options: SafePersistConfig<T, readonly MigrationFn[]>,
): Store<T> => {
  const store = getStore(initialState);
  const baseSetState = store.setState.bind(store);
  const optionObj = parseOptions(options);
  const currentState = store.getState() as T;
  const initialValue = optionObj.storageType
    ? getSafeStorage({ ...optionObj, decode: options.decode, initState: currentState }).state
    : currentState;

  baseSetState(initialValue);

  if (optionObj.storageType) {
    let prevPersistedState = initialValue;

    store.pushMiddleware((nextState, next) => {
      next(nextState);

      const currentState = store.getState() as T;

      if (!Object.is(prevPersistedState, currentState)) {
        setStorage({ ...optionObj, value: currentState });
        prevPersistedState = currentState;
      }
    });
  }

  return store;
};

export function persist<DecodedState, const Steps extends readonly MigrationFn[]>(
  options: SafePersistConfig<DecodedState, Steps>,
): SafeCurriedPersist<DecodedState>;
export function persist<DecodedState, const Steps extends readonly MigrationFn[]>(
  options: SafePersistConfig<DecodedState, Steps>,
): object {
  return definePipeableMiddleware(
    <State>(initialState: State | Store<State>) =>
      applyPersist<State>(
        initialState,
        options as unknown as SafePersistConfig<State, readonly MigrationFn[]>,
      ),
    {
      adds: [],
      after: [],
      before: [],
      conflicts: [],
      duplicate: 'reject',
      id: '@ilokesto/state/persist',
      requires: [],
    } as const,
  );
}