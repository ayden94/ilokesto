import test from 'node:test';
import assert from 'node:assert/strict';

import { CreateForm } from '../dist/index.js';

const standardSchema = validate => ({
  '~standard': {
    version: 1,
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

  assert.equal(form.getValue(['user', 'name']), 'Grace');
  assert.equal(form.getValue('user.name'), 'literal changed');
  assert.deepEqual(form.getValues(), {
    email: '',
    user: { name: 'Grace' },
    'user.name': 'literal changed',
  });
  assert.equal(form.getFieldState(['user', 'name']).dirty, true);
  assert.equal(form.getFieldState(['user', 'name']).modified, true);
  assert.equal(form.getFieldState('user.name').modified, false);
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

  assert.equal(await form.blur('email'), false);
  assert.equal(form.getFieldState('email').touched, true);
  assert.deepEqual(form.getFieldState('email').errors, [
    { type: 'standard_schema', message: 'Email is invalid' },
  ]);

  form.setValue('email', 'ada@example.com');
  assert.equal(await form.trigger('email'), true);
  assert.deepEqual(form.getFieldState('email').errors, []);

  const submitResult = await form.submit(values => values.email);
  assert.equal(submitResult, 'ada@example.com');
  assert.equal(form.getState().submitCount, 1);
});

test('rebases array values, keys, and field metadata together', () => {
  const form = new CreateForm({
    initialValues: {
      items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    },
  });
  const array = form.array('items');

  form.blur(['items', 1, 'name']);
  form.setErrors(['items', 1, 'name'], [{ message: 'Keep me' }]);
  form.setValue(['items', 1, 'name'], 'B', { source: 'user' });

  const initialKeys = [...array.keys()];
  array.move(1, 0);

  assert.deepEqual(form.getValues(), {
    items: [{ name: 'B' }, { name: 'a' }, { name: 'c' }],
  });
  assert.deepEqual(array.keys(), [initialKeys[1], initialKeys[0], initialKeys[2]]);
  assert.deepEqual(form.getFieldState(['items', 0, 'name']).errors, [{ message: 'Keep me' }]);
  assert.equal(form.getFieldState(['items', 0, 'name']).touched, true);
  assert.equal(form.getFieldState(['items', 0, 'name']).modified, true);

  array.remove(0);
  assert.deepEqual(form.getValues(), {
    items: [{ name: 'a' }, { name: 'c' }],
  });
  assert.deepEqual(array.keys(), [initialKeys[0], initialKeys[2]]);
});
