import { createRoot, createSignal } from 'solid-js';
import { expect, test } from 'vitest';

import { useForm } from '../src/solid/index';

type Values = {
  readonly email: string;
  readonly name: string;
};

test('Given a Solid values accessor, when references change, then resets follow the defined reference contract', () => {
  const first = { email: 'first@example.com', name: 'First' };
  const second = { email: 'second@example.com', name: 'Second' };
  const owner = createRoot(dispose => {
    const [values, setValues] = createSignal<Values | undefined>(first);
    const result = useForm({
      defaultValues: { email: '', name: '' },
      resetOptions: { keepDirtyValues: true },
      values,
    });

    return { dispose, form: result.form, setValues };
  });

  expect(owner.form.getValues()).toEqual(first);
  owner.form.setValue('email', 'user@example.com', { source: 'user' });
  owner.form.setErrors('name', [{ message: 'Keep until a value-driven reset' }]);

  owner.setValues(undefined);
  owner.setValues(first);
  expect(owner.form.getValue('email')).toBe('user@example.com');
  expect(owner.form.getFieldState('name').errors).toHaveLength(1);

  owner.setValues(second);
  expect(owner.form.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
  expect(owner.form.getFieldState('name').errors).toEqual([]);

  owner.dispose();
  owner.setValues({ email: 'after-dispose@example.com', name: 'After dispose' });
  expect(owner.form.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
});

test('Given reactive Solid options outside an owner, when useForm runs, then it fails before creating the form', () => {
  let defaultValuesReads = 0;
  const options = {
    get defaultValues(): Values {
      defaultValuesReads += 1;
      return { email: '', name: '' };
    },
    values: () => ({ email: 'first@example.com', name: 'First' }),
  };

  expect(() => useForm(options)).toThrowError(TypeError);
  expect(defaultValuesReads).toBe(0);
});
