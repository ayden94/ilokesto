import { expect, test } from 'vitest';

import {
  createControlledForm,
  getValidation,
  waitForValidations,
} from './helpers/controlledValidation';
import type {
  Deferred,
  ValidationResult,
  Values,
} from './helpers/controlledValidation';

test('Given submit validation made stale by change validation, when the old result is valid, then submit waits for authoritative invalid validation', async () => {
  const validations: Deferred<ValidationResult>[] = [];
  const form = createControlledForm(validations);
  let validCalls = 0;
  let invalidCalls = 0;

  const submission = form.submit(
    () => {
      validCalls += 1;
      return 'submitted';
    },
    () => {
      invalidCalls += 1;
    },
  );
  await waitForValidations(validations, 1);
  form.setValue('email', 'invalid', { validate: true });
  await waitForValidations(validations, 2);
  getValidation(validations, 0).resolve({ value: { email: '', name: '' } });
  await waitForValidations(validations, 3);

  expect(validCalls).toBe(0);
  getValidation(validations, 1).resolve({ value: { email: 'invalid', name: '' } });
  getValidation(validations, 2).resolve({
    issues: [{ message: 'Current email is invalid', path: ['email'] }],
  });

  expect(await submission).toBeUndefined();
  expect(validCalls).toBe(0);
  expect(invalidCalls).toBe(1);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Current email is invalid', type: 'standard_schema' },
  ]);
});

test('Given values change without automatic validation, when pending submit validation resolves, then submit revalidates current values', async () => {
  const validations: Deferred<ValidationResult>[] = [];
  const form = createControlledForm(validations);
  let submittedValues: Values | undefined;

  const submission = form.submit((values) => {
    submittedValues = values;
    return 'submitted';
  });
  await waitForValidations(validations, 1);
  form.setValue('email', 'latest');
  getValidation(validations, 0).resolve({ value: { email: '', name: '' } });
  await waitForValidations(validations, 2);

  expect(submittedValues).toBeUndefined();
  getValidation(validations, 1).resolve({ value: { email: 'latest', name: '' } });

  expect(await submission).toBe('submitted');
  expect(submittedValues).toEqual({ email: 'latest', name: '' });
});
