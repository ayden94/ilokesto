import { test, expect } from 'vitest';

import { CreateForm } from '../src/index';

const standardSchema = (validate: (value: any) => any) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate,
  },
});

test('reads and writes tuple paths without treating string names as dot paths', () => {
  const form = new CreateForm({ defaultValues: {
    email: '',
    user: { name: 'Ada' },
    'user.name': 'literal',
  } });

  form.setValue(['user', 'name'], 'Grace', { source: 'user' });
  form.setValue('user.name', 'literal changed');

  expect(form.getValue(['user', 'name'])).toBe('Grace');
  expect(form.getValue('user.name')).toBe('literal changed');
  expect(form.getValues()).toEqual({
    email: '',
    user: { name: 'Grace' },
    'user.name': 'literal changed',
  });
  expect(form.getFieldState(['user', 'name']).dirty).toBe(true);
  expect(form.getFieldState(['user', 'name']).modified).toBe(true);
  expect(form.getFieldState('user.name').modified).toBe(false);
});

test('runs standard schema validation for blur, manual trigger, and submit', async () => {
  const form = new CreateForm({
    defaultValues: { email: '' },
    validateOn: ['blur', 'submit'],
    schema: standardSchema(values => {
      if (values.email.includes('@')) {
        return { value: values };
      }

      return {
        issues: [
          {
            message: 'Email is invalid',
            path: ['email'],
          },
        ],
      };
    }),
  });

  expect(await form.blur('email')).toBe(false);
  expect(form.getFieldState('email').touched).toBe(true);
  expect(form.getFieldState('email').errors).toEqual([
    { type: 'standard_schema', message: 'Email is invalid' },
  ]);

  form.setValue('email', 'ada@example.com');
  expect(await form.trigger('email')).toBe(true);
  expect(form.getFieldState('email').errors).toEqual([]);

  const submitResult = await form.submit(values => values.email);
  expect(submitResult).toBe('ada@example.com');
  expect(form.getState().submitCount).toBe(1);
  expect(form.getState().isSubmitted).toBe(true);
  expect(form.getState().isSubmitSuccessful).toBe(true);
  expect(form.getState().isSubmitting).toBe(false);
});

test('tracks submit lifecycle for pending, invalid, and throwing submissions', async () => {
  let resolveSubmit: (() => void) | undefined;
  const form = new CreateForm({ defaultValues: { email: 'ada@example.com' } });
  const pendingSubmit = form.submit(() => new Promise<void>(resolve => {
    resolveSubmit = resolve;
  }));

  expect(form.getState().submitCount).toBe(1);
  expect(form.getState().isSubmitting).toBe(true);
  expect(form.getState().isSubmitted).toBe(false);
  expect(form.getState().isSubmitSuccessful).toBe(false);

  for (let index = 0; index < 5 && !resolveSubmit; index += 1) {
    await Promise.resolve();
  }

  expect(resolveSubmit).toBeDefined();
  resolveSubmit?.();
  await pendingSubmit;

  expect(form.getState().isSubmitting).toBe(false);
  expect(form.getState().isSubmitted).toBe(true);
  expect(form.getState().isSubmitSuccessful).toBe(true);

  const invalidForm = new CreateForm({
    defaultValues: { email: '' },
    schema: standardSchema(() => ({ issues: [{ message: 'Invalid', path: ['email'] }] })),
  });

  await invalidForm.submit(() => 'not called');

  expect(invalidForm.getState().submitCount).toBe(1);
  expect(invalidForm.getState().isSubmitting).toBe(false);
  expect(invalidForm.getState().isSubmitted).toBe(true);
  expect(invalidForm.getState().isSubmitSuccessful).toBe(false);

  const throwingForm = new CreateForm({ defaultValues: { email: 'ada@example.com' } });

  await expect(throwingForm.submit(() => {
    throw new Error('submit failed');
  })).rejects.toThrow('submit failed');

  expect(throwingForm.getState().isSubmitting).toBe(false);
  expect(throwingForm.getState().isSubmitted).toBe(true);
  expect(throwingForm.getState().isSubmitSuccessful).toBe(false);
});

test('rebases array values, keys, and field metadata together', async () => {
  const form = new CreateForm({ defaultValues: {
    items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
  } });
  const array = form.array('items');

  await form.blur(['items', 1, 'name']);
  form.setErrors(['items', 1, 'name'], [{ message: 'Keep me' }]);
  form.setValue(['items', 1, 'name'], 'B', { source: 'user' });

  const initialKeys = [...array.keys()];
  array.move(1, 0);

  expect(form.getValues()).toEqual({
    items: [{ name: 'B' }, { name: 'a' }, { name: 'c' }],
  });
  expect(array.keys()).toEqual([initialKeys[1], initialKeys[0], initialKeys[2]]);
  expect(form.getFieldState(['items', 0, 'name']).errors).toEqual([{ message: 'Keep me' }]);
  expect(form.getFieldState(['items', 0, 'name']).touched).toBe(true);
  expect(form.getFieldState(['items', 0, 'name']).modified).toBe(true);
  expect(form.getState().isSubmitting).toBe(false);
  expect(form.getState().isSubmitted).toBe(false);
  expect(form.getState().isSubmitSuccessful).toBe(false);

  array.remove(0);
  expect(form.getValues()).toEqual({
    items: [{ name: 'a' }, { name: 'c' }],
  });
  expect(array.keys()).toEqual([initialKeys[0], initialKeys[2]]);
});

test('resets with keepDirtyValues while updating the default baseline', () => {
  const form = new CreateForm({ defaultValues: {
    email: 'old@example.com',
    profile: { name: 'Ada', role: 'admin' },
  } });

  form.setValue('email', 'edited@example.com', { source: 'user' });

  form.reset({
    email: 'server@example.com',
    profile: { name: 'Grace', role: 'member' },
  }, { keepDirtyValues: true });

  expect(form.getValues()).toEqual({
    email: 'edited@example.com',
    profile: { name: 'Grace', role: 'member' },
  });
  expect(form.getState().defaultValues).toEqual({
    email: 'server@example.com',
    profile: { name: 'Grace', role: 'member' },
  });
  expect(form.getFieldState('email').dirty).toBe(true);
  expect(form.getFieldState('email').modified).toBe(true);
  expect(form.getFieldState(['profile', 'role']).dirty).toBe(false);
  expect(form.getFieldState(['profile', 'role']).modified).toBe(false);
});

test('reset options preserve errors, touched, and submit state for surviving fields', async () => {
  const form = new CreateForm<{ email: string; extra?: string }>({ defaultValues: {
    email: '',
    extra: 'keep path',
  } });

  await form.blur('email');
  await form.submit(values => values);
  form.setErrors('email', [{ message: 'Server error' }]);

  form.reset({
    email: 'server@example.com',
  }, {
    keepErrors: true,
    keepTouched: true,
    keepSubmitState: true,
  });

  expect(form.getValues()).toEqual({ email: 'server@example.com' });
  expect(form.getFieldState('email').errors).toEqual([{ message: 'Server error' }]);
  expect(form.getFieldState('email').touched).toBe(true);
  expect(form.getState().submitCount).toBe(1);
  expect(form.getState().isSubmitted).toBe(true);
  expect(form.getState().isSubmitSuccessful).toBe(true);
  expect(form.getFieldState('extra').errors).toEqual([]);
});

test('keepDirtyValues preserves array dirty fields only at surviving indexes', () => {
  const form = new CreateForm({ defaultValues: {
    items: [{ name: 'a' }, { name: 'b' }],
  } });

  form.setValue(['items', 1, 'name'], 'B', { source: 'user' });

  form.reset({
    items: [{ name: 'server-a' }, { name: 'server-b' }, { name: 'server-c' }],
  }, { keepDirtyValues: true });

  expect(form.getValues()).toEqual({
    items: [{ name: 'server-a' }, { name: 'B' }, { name: 'server-c' }],
  });
  expect(form.getFieldState(['items', 1, 'name']).dirty).toBe(true);
  expect(form.getFieldState(['items', 2, 'name']).dirty).toBe(false);
});

test('field starts with isFocused false and focus() flips it to true', () => {
  const form = new CreateForm({ defaultValues: { email: '', name: '' } });

  expect(form.getFieldState('email').isFocused).toBe(false);

  form.focus('email');

  expect(form.getFieldState('email').isFocused).toBe(true);
});

test('focus on one field does not change another field isFocused', () => {
  const form = new CreateForm({ defaultValues: { email: '', name: '' } });

  form.focus('email');
  form.focus('name');

  expect(form.getFieldState('email').isFocused).toBe(true);
  expect(form.getFieldState('name').isFocused).toBe(true);
});

test('blur clears isFocused regardless of blur validation being enabled', async () => {
  const form = new CreateForm({
    defaultValues: { email: '' },
    validateOn: ['blur'],
    schema: standardSchema(() => ({ value: { email: '' } })),
  });

  form.focus('email');
  expect(form.getFieldState('email').isFocused).toBe(true);

  await form.blur('email');

  expect(form.getFieldState('email').isFocused).toBe(false);
  expect(form.getFieldState('email').touched).toBe(true);
});

test('blur clears isFocused even when blur validation is disabled', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });

  form.focus('email');
  expect(form.getFieldState('email').isFocused).toBe(true);

  await form.blur('email');

  expect(form.getFieldState('email').isFocused).toBe(false);
  expect(form.getFieldState('email').touched).toBe(true);
});

test('reset clears isFocused back to false', () => {
  const form = new CreateForm({ defaultValues: { email: '' } });

  form.focus('email');
  expect(form.getFieldState('email').isFocused).toBe(true);

  form.reset();

  expect(form.getFieldState('email').isFocused).toBe(false);
});

test('array move preserves isFocused on the moved child', () => {
  const form = new CreateForm({ defaultValues: {
    items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
  } });
  const array = form.array('items');

  form.focus(['items', 1, 'name']);
  expect(form.getFieldState(['items', 1, 'name']).isFocused).toBe(true);

  array.move(1, 0);

  expect(form.getFieldState(['items', 0, 'name']).isFocused).toBe(true);
  expect(form.getFieldState(['items', 1, 'name']).isFocused).toBe(false);
});

