import { Store } from '@ilokesto/store';
import { dispose, history, HistoryConfigurationError, throttle } from '@ilokesto/state/middleware';
import type {
  HistoryControls,
  HistoryOptions,
  HistoryStore,
  PersistDecoder,
  PersistDecoderStateDiagnostic,
  PersistMigration,
  SafePersistConfig,
  SafePersistCookieConfig,
  SafePersistLocalConfig,
  SafePersistSessionConfig,
} from '@ilokesto/state/middleware';
import { definePipeableMiddleware, pipe } from '@ilokesto/state/utils';
import type { PipeAnyMiddleware } from '@ilokesto/state/utils';

type LegacyCallRejection<Root> = Root extends (...arguments_: never[]) => unknown
  ? unknown
  : { readonly __pipeCallableRootError: '__pipeCallableRootError' };

const identityMiddleware: PipeAnyMiddleware = (store) => store;
const identity = definePipeableMiddleware(identityMiddleware, { id: '@consumer/identity' } as const);
const rejectedLegacyCall: LegacyCallRejection<typeof pipe> = true;
const legacyStore = pipe({ count: 0 });
const rejectedStoreInput = pipe.use(identity).create(new Store({ count: 0 }));
const historyStore = history({ count: 0 }, undefined);
const throttledStore = throttle({ count: 0 }, 10);
const historyConfigurationError = new HistoryConfigurationError('CONTROL_COLLISION', 'undo');
type PublicMiddlewareTypes =
  | HistoryControls
  | HistoryOptions
  | HistoryStore<{ readonly count: number }>
  | PersistDecoder<{ readonly count: number }>
  | PersistDecoderStateDiagnostic<{ readonly count: number }, { readonly count: number }>
  | PersistMigration
  | SafePersistConfig<{ readonly count: number }>
  | SafePersistCookieConfig<{ readonly count: number }, []>
  | SafePersistLocalConfig<{ readonly count: number }, []>
  | SafePersistSessionConfig<{ readonly count: number }>;
declare const publicMiddlewareTypes: PublicMiddlewareTypes;

rejectedLegacyCall;
legacyStore;
rejectedStoreInput;
dispose(historyStore);
throttledStore.getState().count;
historyConfigurationError.property;
publicMiddlewareTypes;
