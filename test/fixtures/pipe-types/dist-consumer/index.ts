import {
  PipeConfigurationError,
  definePipeableMiddleware,
  pipe,
} from '@ilokesto/state/utils';
import {
  debounce,
  devtools,
  logger,
  persist,
  validate,
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

const counterSchema = {
  '~standard': {
    validate: (value: unknown) => ({ value }),
    vendor: 'consumer',
    version: 1,
  },
} as const;

const store = builder
  .use(stateIdentityMiddleware)
  .use(logger())
  .use(debounce())
  .use(devtools('dist-consumer'))
  .use(persist({ local: 'dist-consumer' }))
  .use(validate(counterSchema))
  .create({ count: 0 });

function configurationErrorCode(error: unknown): string {
  if (error instanceof PipeConfigurationError) {
    return error.code;
  }

  return 'unknown';
}

metadata.id;
duplicatePolicy;
configurationErrorCode(configurationError);
store.increment();
store.getState().count;
