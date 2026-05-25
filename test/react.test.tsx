// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import { useForm } from '../src/react/index';

afterEach(() => {
  cleanup();
});

const standardSchema = (validate: (value: any) => any) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate,
  },
});

test('useRegister binds text input changes through DOM events', () => {
  const form = new CreateForm({ initialValues: { email: '' } });

  function Example() {
    const { useRegister } = useForm(form);
    const email = useRegister({ name: 'email' });

    return <input aria-label="email" {...email} />;
  }

  render(<Example />);

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'ada@example.com' } });

  expect((screen.getByLabelText('email') as HTMLInputElement).type).toBe('text');
  expect(form.getValue('email')).toBe('ada@example.com');
  expect(form.getFieldState('email').dirty).toBe(true);
  expect(form.getFieldState('email').modified).toBe(true);
});

test('useField returns props, field state, and setter without nested register', async () => {
  const form = new CreateForm({ initialValues: { email: '' } });

  function Example() {
    const { useField } = useForm(form);
    const email = useField({ name: 'email' });

    return (
      <>
        <input aria-label="email" {...email.props} />
        <button type="button" onClick={() => email.setValue('grace@example.com')}>set</button>
        <output aria-label="value">{String(email.value)}</output>
        <output aria-label="dirty">{String(email.dirty)}</output>
        <output aria-label="touched">{String(email.touched)}</output>
        <output aria-label="has-register">{String('register' in email)}</output>
      </>
    );
  }

  render(<Example />);

  expect(screen.getByLabelText('has-register').textContent).toBe('false');

  fireEvent.click(screen.getByRole('button', { name: 'set' }));
  await waitFor(() => expect(screen.getByLabelText('value').textContent).toBe('grace@example.com'));

  fireEvent.blur(screen.getByLabelText('email'));
  await waitFor(() => expect(screen.getByLabelText('touched').textContent).toBe('true'));
});

test('useRegister returns map-friendly bindings for an options array', () => {
  const form = new CreateForm({
    initialValues: {
      bio: '',
      agreed: false,
      color: 'red',
      role: 'user',
    },
  });

  function Example() {
    const { useRegister } = useForm(form);
    const [bio] = useRegister<HTMLTextAreaElement>([{ name: 'bio' }]);
    const [agreed, red, blue] = useRegister([
      { name: 'agreed', type: 'checkbox' },
      { name: 'color', type: 'radio', value: 'red' },
      { name: 'color', type: 'radio', value: 'blue' },
    ]);
    const role = useRegister<HTMLSelectElement>({ name: 'role' });

    return (
      <>
        <textarea aria-label="bio" {...bio} />
        <input aria-label="agreed" type="checkbox" {...agreed} />
        <input aria-label="red" type="radio" {...red} />
        <input aria-label="blue" type="radio" {...blue} />
        <select aria-label="role" {...role}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </>
    );
  }

  render(<Example />);

  fireEvent.change(screen.getByLabelText('bio'), { target: { value: 'hello' } });
  fireEvent.click(screen.getByLabelText('agreed'));
  fireEvent.click(screen.getByLabelText('blue'));
  fireEvent.change(screen.getByLabelText('role'), { target: { value: 'admin' } });

  expect(form.getValues()).toEqual({
    bio: 'hello',
    agreed: true,
    color: 'blue',
    role: 'admin',
  });
});

test('useRegister returns a binding array for rest arguments', () => {
  const form = new CreateForm({ initialValues: { color: 'red' } });

  function Example() {
    const { useRegister } = useForm(form);
    const [red, blue] = useRegister(
      { name: 'color', type: 'radio', value: 'red' },
      { name: 'color', type: 'radio', value: 'blue' },
    );

    return (
      <>
        <input aria-label="red" type="radio" {...red} />
        <input aria-label="blue" type="radio" {...blue} />
      </>
    );
  }

  render(<Example />);

  expect((screen.getByLabelText('red') as HTMLInputElement).type).toBe('radio');
  fireEvent.click(screen.getByLabelText('blue'));

  expect(form.getValue('color')).toBe('blue');
});

test('multiple select receives array value from restored container values on first render', () => {
  const form = new CreateForm({
    initialValues: {
      topics: ['state'],
    },
  });

  function Example() {
    const { useField } = useForm(form);
    const topics = useField<HTMLSelectElement>({ name: 'topics' });

    return (
      <>
        <select aria-label="topics" multiple {...topics.props}>
          <option value="state">State</option>
          <option value="react">React</option>
        </select>
        <output aria-label="is-array">{String(Array.isArray(topics.value))}</output>
      </>
    );
  }

  render(<Example />);

  const select = screen.getByLabelText('topics') as HTMLSelectElement;

  expect(screen.getByLabelText('is-array').textContent).toBe('true');
  expect(select.selectedOptions[0]?.value).toBe('state');

  select.options[1]!.selected = true;
  fireEvent.change(select);

  expect(form.getValues()).toEqual({
    topics: ['state', 'react'],
  });
});

test('useFormState exposes aggregate errors, dirty, touched, and validity', async () => {
  const form = new CreateForm({ initialValues: { email: '' } });

  function Example() {
    const { useRegister, useFormState } = useForm(form);
    const email = useRegister({ name: 'email' });
    const state = useFormState();

    return (
      <>
        <input aria-label="email" {...email} />
        <output aria-label="dirty">{String(state.isDirty)}</output>
        <output aria-label="valid">{String(state.isValid)}</output>
        <output aria-label="touched-count">{String(Object.keys(state.touchedFields).length)}</output>
      </>
    );
  }

  render(<Example />);

  form.setErrors('email', [{ message: 'Required' }]);
  await waitFor(() => expect(screen.getByLabelText('valid').textContent).toBe('false'));

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'ada@example.com' } });
  await waitFor(() => expect(screen.getByLabelText('dirty').textContent).toBe('true'));

  fireEvent.blur(screen.getByLabelText('email'));
  await waitFor(() => expect(screen.getByLabelText('touched-count').textContent).toBe('1'));
});

test('field-local schema overrides form-level schema for a registered field', async () => {
  const form = new CreateForm({
    initialValues: { email: '' },
    validateOn: ['blur', 'submit'],
    schema: standardSchema(() => ({
      issues: [{ message: 'Form-level error', path: ['email'] }],
    })),
  });

  const emailSchema = standardSchema((value: string) => {
    if (value.includes('@')) {
      return { value };
    }

    return { issues: [{ message: 'Field-level error' }] };
  });

  function Example() {
    const { useField } = useForm(form);
    const email = useField({ name: 'email', schema: emailSchema });

    return (
      <>
        <input aria-label="email" {...email.props} />
        <output aria-label="errors">{email.errors.map(error => error.message).join(',')}</output>
      </>
    );
  }

  render(<Example />);

  fireEvent.blur(screen.getByLabelText('email'));
  await waitFor(() => expect(screen.getByLabelText('errors').textContent).toBe('Field-level error'));

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'ada@example.com' } });
  expect(await form.trigger('email')).toBe(true);

  await waitFor(() => expect(screen.getByLabelText('errors').textContent).toBe(''));
});
