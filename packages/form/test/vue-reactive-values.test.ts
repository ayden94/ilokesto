import { effectScope, nextTick, shallowRef } from 'vue';
import { expect, test } from 'vitest';

import type { Form } from '../src/index';
import { useForm } from '../src/vue/index';

type Values = {
  readonly email: string;
  readonly name: string;
};

test('Given a Vue values source, when references change, then resets follow the defined reference contract', async () => {
  const first = { email: 'first@example.com', name: 'First' };
  const second = { email: 'second@example.com', name: 'Second' };
  const values = shallowRef<Values | undefined>(first);
  const scope = effectScope();
  let form: Form<Values> | undefined;

  scope.run(() => {
    form = useForm({
      defaultValues: { email: '', name: '' },
      resetOptions: { keepDirtyValues: true },
      values,
    }).form;
  });
  if (form === undefined) throw new TypeError('Vue form was not created');
  expect(form.getValues()).toEqual(first);

  form.setValue('email', 'user@example.com', { source: 'user' });
  form.setErrors('name', [{ message: 'Keep until a value-driven reset' }]);

  values.value = undefined;
  await nextTick();
  values.value = first;
  await nextTick();
  expect(form.getValue('email')).toBe('user@example.com');
  expect(form.getFieldState('name').errors).toHaveLength(1);

  values.value = second;
  await nextTick();
  expect(form.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
  expect(form.getFieldState('name').errors).toEqual([]);

  scope.stop();
  values.value = { email: 'after-stop@example.com', name: 'After stop' };
  await nextTick();
  expect(form.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
});

test('Given reactive Vue options outside an effect scope, when useForm runs, then it fails before creating the form', () => {
  let defaultValuesReads = 0;
  const values = shallowRef<Values | undefined>({ email: 'first@example.com', name: 'First' });
  const options = {
    get defaultValues(): Values {
      defaultValuesReads += 1;
      return { email: '', name: '' };
    },
    values,
  };

  expect(() => useForm(options)).toThrowError(TypeError);
  expect(defaultValuesReads).toBe(0);
});
