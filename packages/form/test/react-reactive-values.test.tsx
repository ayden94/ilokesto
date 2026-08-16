// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import type { Form, ResetOptions } from '../src/index';
import { useForm } from '../src/react/index';

type Values = {
  readonly email: string;
  readonly name: string;
};

afterEach(() => {
  cleanup();
});

test('Given external values, when render references change, then React resets only for new defined references', async () => {
  const first = { email: 'first@example.com', name: 'First' };
  const second = { email: 'second@example.com', name: 'Second' };
  let form: Form<Values> | undefined;

  function Example({ resetOptions, values }: {
    readonly resetOptions?: ResetOptions;
    readonly values: Values | undefined;
  }) {
    const result = useForm({
      defaultValues: { email: '', name: '' },
      resetOptions,
      values,
    });
    form = result.form;
    return null;
  }

  const view = render(<Example resetOptions={{ keepDirtyValues: true }} values={first} />);
  await waitFor(() => expect(form?.getValues()).toEqual(first));
  if (form === undefined) throw new TypeError('React form was not created');

  form.setValue('email', 'user@example.com', { source: 'user' });
  form.setErrors('name', [{ message: 'Keep until a value-driven reset' }]);

  view.rerender(<Example resetOptions={{ keepDirtyValues: false }} values={first} />);
  expect(form.getValue('email')).toBe('user@example.com');
  expect(form.getFieldState('name').errors).toHaveLength(1);

  view.rerender(<Example resetOptions={{ keepDirtyValues: true }} values={undefined} />);
  view.rerender(<Example resetOptions={{ keepDirtyValues: true }} values={first} />);
  expect(form.getValue('email')).toBe('user@example.com');
  expect(form.getFieldState('name').errors).toHaveLength(1);

  view.rerender(<Example resetOptions={{ keepDirtyValues: true }} values={second} />);
  await waitFor(() => {
    expect(form?.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
    expect(form?.getFieldState('name').errors).toEqual([]);
  });
});

test('Given a React values owner, when it unmounts, then later parent renders cannot reset its form', async () => {
  const first = { email: 'first@example.com', name: 'First' };
  const second = { email: 'second@example.com', name: 'Second' };
  let form: Form<Values> | undefined;

  function Child({ values }: { readonly values: Values }) {
    form = useForm({ defaultValues: { email: '', name: '' }, values }).form;
    return null;
  }

  function Parent({ active, values }: { readonly active: boolean; readonly values: Values }) {
    return active ? <Child values={values} /> : null;
  }

  const view = render(<Parent active values={first} />);
  await waitFor(() => expect(form?.getValues()).toEqual(first));
  if (form === undefined) throw new TypeError('React form was not created');

  view.rerender(<Parent active={false} values={second} />);
  expect(form.getValues()).toEqual(first);
});

test('Given the same NaN render value, when only resetOptions changes, then React uses Object.is and does not reset', async () => {
  let form: Form<number> | undefined;

  function Example({ resetOptions }: { readonly resetOptions: ResetOptions }) {
    form = useForm({ defaultValues: 0, resetOptions, values: Number.NaN }).form;
    return null;
  }

  const view = render(<Example resetOptions={{ keepErrors: true }} />);
  await waitFor(() => expect(form?.getValues()).toBeNaN());
  if (form === undefined) throw new TypeError('React form was not created');

  form.setErrors([], [{ message: 'Keep without a value-driven reset' }]);
  view.rerender(<Example resetOptions={{ keepErrors: false }} />);

  expect(form.getFieldState([]).errors).toHaveLength(1);
});
