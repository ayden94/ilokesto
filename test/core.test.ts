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
  const form = new CreateForm({
    initialValues: {
      email: '',
      user: { name: 'Ada' },
      'user.name': 'literal',
    },
  });

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
    initialValues: { email: '' },
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
});

test('rebases array values, keys, and field metadata together', async () => {
  const form = new CreateForm({
    initialValues: {
      items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    },
  });
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

  array.remove(0);
  expect(form.getValues()).toEqual({
    items: [{ name: 'a' }, { name: 'c' }],
  });
  expect(array.keys()).toEqual([initialKeys[0], initialKeys[2]]);
});