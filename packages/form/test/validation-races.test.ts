import { expect, test } from 'vitest';

import {
  createControlledForm,
  getValidation,
  waitForValidations,
} from './helpers/controlledValidation';
import type { Deferred, ValidationResult } from './helpers/controlledValidation';

test('Given independent field validations, when they resolve out of order, then both apply their own errors', async () => {
  const validations: Deferred<ValidationResult>[] = [];
  const form = createControlledForm(validations);

  const emailValidation = form.trigger('email');
  await waitForValidations(validations, 1);
  const nameValidation = form.trigger('name');
  await waitForValidations(validations, 2);
  getValidation(validations, 1).resolve({
    issues: [{ message: 'Name is invalid', path: ['name'] }],
  });
  getValidation(validations, 0).resolve({
    issues: [{ message: 'Email is invalid', path: ['email'] }],
  });

  expect(await emailValidation).toBe(false);
  expect(await nameValidation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Email is invalid', type: 'standard_schema' },
  ]);
  expect(form.getFieldState('name').errors).toEqual([
    { message: 'Name is invalid', type: 'standard_schema' },
  ]);
});

test('Given two validations for one field, when the older resolves last, then it cannot overwrite the newer result', async () => {
  const validations: Deferred<ValidationResult>[] = [];
  const form = createControlledForm(validations);

  const older = form.trigger('email');
  await waitForValidations(validations, 1);
  const newer = form.trigger('email');
  await waitForValidations(validations, 2);
  getValidation(validations, 1).resolve({
    issues: [{ message: 'Current error', path: ['email'] }],
  });
  expect(await newer).toBe(false);
  getValidation(validations, 0).resolve({ value: { email: '', name: '' } });

  expect(await older).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Current error', type: 'standard_schema' },
  ]);
});
