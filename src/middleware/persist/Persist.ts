import type { PersistDecoderStateDiagnostic as PipePersistDecoderStateDiagnostic } from '../../utils/pipe/types';

export type PersistMigration<Input = unknown, Output = unknown> = (state: Input) => Output;

export type PersistDecoder<State> = (value: unknown) => State | null;

export type PersistDecoderStateDiagnostic<DecodedState, StoreState> =
  PipePersistDecoderStateDiagnostic<DecodedState, StoreState>;

export type PersistDecoderStateValidation<DecodedState, StoreState> = [StoreState] extends [
  DecodedState,
]
  ? [DecodedState] extends [StoreState]
    ? unknown
    : PersistDecoderStateDiagnostic<DecodedState, StoreState>
  : PersistDecoderStateDiagnostic<DecodedState, StoreState>;

export type MigrationFn = {
  bivarianceHack(state: unknown): unknown;
}['bivarianceHack'];

type MigrationTupleValidation<
  Steps extends readonly MigrationFn[],
  PreviousOutput = unknown,
> = Steps extends readonly [
  infer First extends MigrationFn,
  ...infer Rest extends readonly MigrationFn[],
]
  ? First extends PersistMigration<infer NextInput, infer NextOutput>
    ? [PreviousOutput] extends [NextInput]
      ? MigrationTupleValidation<Rest, NextOutput>
      : {
          readonly __persistMigrationChainError: '__persistMigrationChainError';
          readonly previous: PreviousOutput;
          readonly next: NextInput;
        }
    : never
  : unknown;

type ValidMigrationTuple<Steps extends readonly MigrationFn[]> = Steps &
  MigrationTupleValidation<Steps>;

type MigrationPipe<
  Steps extends Array<MigrationFn>,
  PreviousOutput = unknown,
> = Steps extends [infer First, ...infer Rest extends Array<MigrationFn>]
  ? First extends PersistMigration<infer Input, infer Output>
    ? Input extends PreviousOutput
      ? [First, ...MigrationPipe<Rest, Output>] extends Steps
        ? [First, ...MigrationPipe<Rest, Output>]
        : never
      : never
    : never
  : [];

type Migrate<T, Steps extends Array<MigrationFn>> = Steps extends [
  ...infer _Rest,
  infer Last,
]
  ? Last extends PersistMigration<never, infer LastOutput>
    ? T extends LastOutput
      ? MigrationPipe<Steps>
      : never
    : never
  : never;

export type SafePersistLocalConfig<
  State,
  Steps extends readonly MigrationFn[],
> = {
  readonly local: string;
  readonly decode: PersistDecoder<State>;
  readonly migrate?: ValidMigrationTuple<Steps>;
};

export type SafePersistCookieConfig<
  State,
  Steps extends readonly MigrationFn[],
> = {
  readonly cookie: string;
  readonly decode: PersistDecoder<State>;
  readonly migrate?: ValidMigrationTuple<Steps>;
};

export type SafePersistSessionConfig<State> = {
  readonly session: string;
  readonly decode: PersistDecoder<State>;
  readonly migrate?: never;
};

export type SafePersistConfig<
  State,
  Steps extends readonly MigrationFn[] = readonly [],
> =
  | SafePersistLocalConfig<State, Steps>
  | SafePersistCookieConfig<State, Steps>
  | SafePersistSessionConfig<State>;

type StorageConfig<T = unknown, Steps extends Array<MigrationFn> = Array<MigrationFn>> = {
  local: {
    local: string;
    session?: never;
    cookie?: never;
    migrate?: Migrate<T, Steps>;
  };
  session: {
    local?: never;
    session: string;
    cookie?: never;
    migrate?: never;
  };
  cookie: {
    local?: never;
    session?: never;
    cookie: string;
    migrate?: Migrate<T, Steps>;
  };
};

export type PersistConfig<T, Steps extends Array<MigrationFn>> = StorageConfig<
  T,
  Steps
>[keyof StorageConfig];

export type PersistUtils = {
  common: {
    storageKey: string;
    storageType: keyof StorageConfig | null;
  };
  getStorage: <T, Steps extends Array<MigrationFn>>(
    props: PersistUtils['common'] & {
      migrate?: Migrate<T, Steps>;
      initState: T;
    },
  ) => { state: T; version: number };
  setStorage: <T>(
    props: PersistUtils['common'] & {
      storageVersion: number;
      value: T;
    },
  ) => void;
  execMigration: <T, Steps extends Array<MigrationFn>>(
    props: PersistUtils['common'] & {
      migrate?: Migrate<T, Steps>;
    },
  ) => { state: unknown; version: number } | null;
};
