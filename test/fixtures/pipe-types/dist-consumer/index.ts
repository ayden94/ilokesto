import {
  PipeConfigurationError,
  definePipeableMiddleware,
  pipe,
} from '@ilokesto/state/utils';
import {
  debounce,
  devtools,
  dispose,
  history,
  HistoryConfigurationError,
  logger,
  persist,
  throttle,
  validate,
} from '@ilokesto/state/middleware';
import type {
  HistoryControls,
  HistoryOptions,
  HistoryStore,
  PersistConfig,
  PersistDecoder,
  PersistDecoderStateDiagnostic,
  PersistMigration,
  SafePersistConfig,
  SafePersistCookieConfig,
  SafePersistLocalConfig,
  SafePersistSessionConfig,
} from '@ilokesto/state/middleware';
import type {
  Pipe,
  PipeAnyMiddleware,
  PipeBuilder,
  PipeCapability,
  PipeDuplicatePolicy,
  PipeMiddleware,
  PipeMiddlewareMetadata,
} from '@ilokesto/state/utils';

type CounterState = {
  readonly count: number;
};

type LegacyPersistConfig = PersistConfig<CounterState, []>;
type PersistDecoderDiagnostic = PersistDecoderStateDiagnostic<CounterState, CounterState>;

type IncrementCapability = PipeCapability<
  '@consumer/increment',
  { readonly increment: () => void }
>;

const incrementCapability = {
  id: '@consumer/increment',
  shape: { increment: (): void => undefined },
} as const satisfies IncrementCapability;

const addIncrement: PipeAnyMiddleware<readonly [], readonly [IncrementCapability]> = (store) => {
  return Object.assign(store, incrementCapability.shape);
};

const incrementMiddleware = definePipeableMiddleware(addIncrement, {
  adds: [incrementCapability],
  duplicate: 'reject',
  id: '@consumer/increment',
} as const);

const stateIdentity: PipeMiddleware<CounterState> = (store) => store;
const stateIdentityMiddleware = definePipeableMiddleware(stateIdentity, {
  id: '@consumer/state-identity',
} as const);

const metadata: PipeMiddlewareMetadata = { id: '@consumer/metadata' };
const duplicatePolicy: PipeDuplicatePolicy = 'reject';
const root: Pipe = pipe;
type PublicPipeBuilder = PipeBuilder;
const builder = root.use(incrementMiddleware);
const configurationError = new PipeConfigurationError('INVALID_METADATA', 'consumer error', {
  id: '@consumer/error',
  ids: ['@consumer/error'],
});
const historyConfigurationError = new HistoryConfigurationError('CONTROL_COLLISION', 'undo');

const counterSchema = {
  '~standard': {
    validate: (value: unknown) => ({ value }),
    vendor: 'consumer',
    version: 1,
  },
} as const;
const historyOptions: HistoryOptions = { limit: 2 };
const decodeCounter: PersistDecoder<CounterState> = (value) => {
  if (typeof value !== 'object' || value === null || !('count' in value)) {
    return null;
  }

  return typeof value.count === 'number' ? { count: value.count } : null;
};
const safeLocalConfig: SafePersistLocalConfig<CounterState, []> = {
  decode: decodeCounter,
  local: 'dist-safe-local',
};
const safeCookieConfig: SafePersistCookieConfig<CounterState, []> = {
  cookie: 'dist-safe-cookie',
  decode: decodeCounter,
};
const safeSessionConfig: SafePersistSessionConfig<CounterState> = {
  decode: decodeCounter,
  session: 'dist-safe-session',
};
const safePersistConfig: SafePersistConfig<CounterState> = safeLocalConfig;
const legacyPersistConfig: LegacyPersistConfig = { local: 'dist-legacy' };
const migration: PersistMigration<unknown, CounterState> = () => ({ count: 0 });
declare const historyControls: HistoryControls;
declare const persistDecoderDiagnostic: PersistDecoderDiagnostic;

const store = builder
  .use(stateIdentityMiddleware)
  .use(logger())
  .use(debounce())
  .use(devtools('dist-consumer'))
  .use(persist({ local: 'dist-consumer' }))
  .use(validate(counterSchema))
  .create({ count: 0 });
const historyStore: HistoryStore<CounterState> = history({ count: 0 }, historyOptions);
const throttledStore = throttle({ count: 0 }, 10);
const safeDirectStore = persist({ count: 0 }, safePersistConfig);
const safeCookieStore = persist({ count: 0 }, safeCookieConfig);
const safeSessionStore = persist({ count: 0 }, safeSessionConfig);
const safeCurriedStore = pipe.use(persist(safeLocalConfig)).create({ count: 0 });
const legacyDirectStore = persist({ count: 0 }, legacyPersistConfig);
const legacyCurriedStore = pipe.use(persist(legacyPersistConfig)).create({ count: 0 });

function configurationErrorCode(error: unknown): string {
  if (error instanceof PipeConfigurationError) {
    return error.code;
  }

  return 'unknown';
}

metadata.id;
duplicatePolicy;
configurationErrorCode(configurationError);
historyConfigurationError.code;
store.increment();
store.getState().count;
dispose(historyStore);
historyControls.clearHistory();
persistDecoderDiagnostic.decoded.count;
migration(undefined);
throttledStore.getState().count;
safeDirectStore.getState().count;
safeCookieStore.getState().count;
safeSessionStore.getState().count;
safeCurriedStore.getState().count;
legacyDirectStore.getState().count;
legacyCurriedStore.getState().count;
