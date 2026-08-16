import { CreateForm } from '../../src/index';
import type { StandardSchemaV1 } from '../../src/index';

export type Values = {
  readonly email: string;
  readonly name: string;
};

export type ValidationResult = StandardSchemaV1.Result<Values>;

export type Deferred<Result> = {
  readonly promise: Promise<Result>;
  readonly resolve: (result: Result) => void;
};

const createDeferred = <Result>(): Deferred<Result> => {
  let settle: ((result: Result) => void) | undefined;
  const promise = new Promise<Result>((resolve) => {
    settle = resolve;
  });

  return {
    promise,
    resolve: (result) => {
      if (settle === undefined) throw new TypeError('Deferred promise was not initialized');
      settle(result);
    },
  };
};

export const getValidation = (
  validations: readonly Deferred<ValidationResult>[],
  index: number,
): Deferred<ValidationResult> => {
  const validation = validations[index];
  if (validation === undefined) throw new TypeError(`Missing validation at index ${index}`);
  return validation;
};

export const waitForValidations = async (
  validations: readonly Deferred<ValidationResult>[],
  count: number,
): Promise<void> => {
  for (let turn = 0; turn < 10 && validations.length < count; turn += 1) {
    await Promise.resolve();
  }
  if (validations.length !== count) {
    throw new RangeError(`Expected ${count} validations, received ${validations.length}`);
  }
};

export const createControlledForm = (
  validations: Deferred<ValidationResult>[],
): CreateForm<Values> => {
  const schema = {
    '~standard': {
      validate: () => {
        const validation = createDeferred<ValidationResult>();
        validations.push(validation);
        return validation.promise;
      },
      vendor: 'validation-races',
      version: 1,
    },
  } satisfies StandardSchemaV1<unknown, Values>;

  return new CreateForm({
    defaultValues: { email: '', name: '' },
    schema,
  });
};
