import type { PersistDecoderStateDiagnostic as PipePersistDecoderStateDiagnostic } from '../../utils/pipe/types.js';

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

export type PersistUtils = {
  common: {
    storageKey: string;
    storageType: 'local' | 'session' | 'cookie' | null;
  };
  setStorage: <T>(
    props: PersistUtils['common'] & {
      storageVersion: number;
      value: T;
    },
  ) => void;
};