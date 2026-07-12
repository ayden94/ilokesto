import { Store } from '@ilokesto/store';
import { getStore } from '../../lib/getStore';
import { definePipeableMiddleware } from '../../utils/pipe/metadata';
import type { PipeableMiddleware } from '../../utils/pipe/metadata';
import type {
  PipeAnyMiddleware,
  PipeMiddleware,
  PipeMiddlewareMetadata,
} from '../../utils/pipe/types';
import type {
  MigrationFn,
  PersistConfig,
  PersistDecoderStateValidation,
  SafePersistConfig,
} from './Persist';
import { getSafeStorage, getStorage, parseOptions, setStorage } from './persistUtils';

type PersistMetadata = PipeMiddlewareMetadata<
  '@ilokesto/state/persist',
  readonly [],
  readonly [],
  'reject',
  readonly []
>;

type LegacyPersistConfig<T, Steps extends Array<MigrationFn>> = PersistConfig<T, Steps> & {
  readonly decode?: never;
};

type CurriedPersist = (<T>(initialState: T | Store<T>) => Store<T>) &
  PipeableMiddleware<PipeAnyMiddleware, PersistMetadata>;

type SafeCurriedPersist<State> = PipeableMiddleware<
  PipeMiddleware<State>,
  PersistMetadata,
  'persist-decoder'
>;

type RuntimePersistConfig<T, Steps extends Array<MigrationFn>> =
  | PersistConfig<T, Steps>
  | SafePersistConfig<T, readonly MigrationFn[]>;

const isSafePersistConfig = <T, Steps extends Array<MigrationFn>>(
  options: RuntimePersistConfig<T, Steps>,
): options is SafePersistConfig<T, readonly MigrationFn[]> =>
  'decode' in options && typeof options.decode === 'function';

const applyPersist = <T, P extends Array<MigrationFn>>(
  initialState: T | Store<T>,
  options: RuntimePersistConfig<T, P>,
): Store<T> => {
  const store = getStore(initialState);
  const baseSetState = store.setState.bind(store);
  const optionObj = parseOptions(options);
  const currentState = store.getState() as T;
  const initialValue = optionObj.storageType
    ? isSafePersistConfig(options)
      ? getSafeStorage({ ...optionObj, decode: options.decode, initState: currentState }).state
      : getStorage({ ...optionObj, migrate: options.migrate, initState: currentState }).state
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

export function persist<
  StoreState,
  DecodedState,
  const Steps extends readonly MigrationFn[],
>(
  initialState: (StoreState | Store<StoreState>) &
    PersistDecoderStateValidation<DecodedState, StoreState>,
  options: SafePersistConfig<DecodedState, Steps>,
): Store<DecodedState>;
export function persist<DecodedState, const Steps extends readonly MigrationFn[]>(
  options: SafePersistConfig<DecodedState, Steps>,
): SafeCurriedPersist<DecodedState>;
/** @deprecated Decoder-less persist is retained for source compatibility. */
export function persist<T, Steps extends Array<MigrationFn>>(
  initialState: T | Store<T>,
  options: LegacyPersistConfig<T, Steps>,
): Store<T>;
/** @deprecated Decoder-less persist is retained for source compatibility. */
export function persist<Steps extends Array<MigrationFn>>(
  options: LegacyPersistConfig<unknown, Steps>,
): CurriedPersist;
export function persist<T, Steps extends Array<MigrationFn>>(
  first:
    | T
    | Store<T>
    | PersistConfig<unknown, Steps>
    | SafePersistConfig<unknown, readonly MigrationFn[]>,
  second?: PersistConfig<T, Steps> | SafePersistConfig<T, readonly MigrationFn[]>,
): object {
  if (arguments.length === 1) {
    const options = first as RuntimePersistConfig<unknown, Steps>;

    return definePipeableMiddleware(
      <State>(initialState: State | Store<State>) =>
        applyPersist<State, Steps>(initialState, options as RuntimePersistConfig<State, Steps>),
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

  return applyPersist(first as T | Store<T>, second as RuntimePersistConfig<T, Steps>);
}
