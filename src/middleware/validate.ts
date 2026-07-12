import type { Store } from '@ilokesto/store';
import { getStore } from '../lib/getStore';
import { definePipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeableMiddleware } from '../utils/pipe/metadata';
import type { PipeMiddleware, PipeMiddlewareMetadata } from '../utils/pipe/types';

type StoreSetStateAction<T> = Parameters<Store<T>['setState']>[0];

type StandardSchemaIssue = {
  readonly message: string;
  readonly path?: ReadonlyArray<unknown>;
};

type StandardSchemaResult<T> =
  | {
      readonly value: T;
    }
  | {
      readonly issues: ReadonlyArray<StandardSchemaIssue>;
    };

type StandardSchemaV1<Input = unknown, Output = Input> = {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
    readonly types?: {
      readonly input: NoInfer<Input>;
      readonly output: NoInfer<Output>;
    };
  };
};

type ValidatePipeMiddleware<T> = PipeableMiddleware<
  PipeMiddleware<T>,
  PipeMiddlewareMetadata<'@ilokesto/state/validate', readonly [], readonly [], 'reject', readonly []>
>;

type StandardSchemaOutput<Result> = Result extends { readonly value: infer Output } ? Output : never;

type StandardSchemaState<Schema extends StandardSchemaV1> = StandardSchemaOutput<
  Awaited<ReturnType<Schema['~standard']['validate']>>
>;

const isPromiseLike = <T>(value: T | Promise<T>): value is Promise<T> => {
  return typeof value === 'object' && value !== null && 'then' in value;
};

const applyValidate = <T>(initialState: T | Store<T>, schema: StandardSchemaV1<T, T>): Store<T> => {
  const store = getStore(initialState);

  store.pushMiddleware((nextState: StoreSetStateAction<T>, next) => {
    const resolvedState =
      typeof nextState === 'function'
        ? (nextState as (prev: Readonly<T>) => T)(store.getState() as T)
        : nextState;

    const result = schema['~standard'].validate(resolvedState);

    if (isPromiseLike(result)) {
      console.error(
        '[Validation Error] Async Standard Schema is not supported in validate middleware.',
      );
      return;
    }

    if ('issues' in result) {
      console.error('[Validation Error] Invalid state:', result.issues);
      return;
    }

    next(result.value);
  });

  return store;
};

export function validate<T>(
  initialState: T | Store<T>,
  schema: StandardSchemaV1<NoInfer<T>, NoInfer<T>>,
): Store<T>;
export function validate<Schema extends StandardSchemaV1>(
  schema: Schema,
): ValidatePipeMiddleware<StandardSchemaState<Schema>>;
export function validate<T>(
  first: T | Store<T> | StandardSchemaV1<T, T>,
  second?: StandardSchemaV1<T, T>,
) {
  if (arguments.length === 1) {
    const schema = first as StandardSchemaV1<T, T>;
    const middleware: PipeMiddleware<T> = (store) => applyValidate(store, schema);

    return definePipeableMiddleware(middleware, {
      conflicts: [],
      duplicate: 'reject',
      id: '@ilokesto/state/validate',
    } as const);
  }

  return applyValidate(first as T | Store<T>, second as StandardSchemaV1<T, T>);
}
