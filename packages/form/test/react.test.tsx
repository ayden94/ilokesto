// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, test } from 'vitest';

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
  const form = new CreateForm({ defaultValues: { email: '' } });

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

test('useForm can create a stable form from options', () => {
  function Example({ initialEmail }: { initialEmail: string }) {
    const { useRegister, form } = useForm({ defaultValues: { email: initialEmail } });
    const email = useRegister({ name: 'email' });

    return (
      <>
        <input aria-label="email" {...email} />
        <output aria-label="value">{String(form.getValue('email'))}</output>
      </>
    );
  }

  const { rerender } = render(<Example initialEmail="first@example.com" />);

  expect((screen.getByLabelText('email') as HTMLInputElement).value).toBe('first@example.com');

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'user@example.com' } });
  expect(screen.getByLabelText('value').textContent).toBe('user@example.com');

  rerender(<Example initialEmail="server-refetch@example.com" />);

  expect((screen.getByLabelText('email') as HTMLInputElement).value).toBe('user@example.com');
});

test('useForm reacts to values option changes with resetOptions', async () => {
  type Values = {
    email: string;
    displayName: string;
  };

  function Example({ values }: { values: Values }) {
    const { useRegister, useFormState } = useForm({
      defaultValues: { email: '', displayName: '' },
      values,
      resetOptions: { keepDirtyValues: true },
    });
    const [email, displayName] = useRegister([
      { name: 'email' },
      { name: 'displayName' },
    ]);
    const state = useFormState();

    return (
      <>
        <input aria-label="email" {...email} />
        <input aria-label="display name" {...displayName} />
        <output aria-label="dirty">{String(state.isDirty)}</output>
      </>
    );
  }

  const { rerender } = render(<Example values={{ email: 'server@example.com', displayName: 'Server User' }} />);

  await waitFor(() => {
    expect((screen.getByLabelText('email') as HTMLInputElement).value).toBe('server@example.com');
    expect((screen.getByLabelText('display name') as HTMLInputElement).value).toBe('Server User');
  });

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'user@example.com' } });

  rerender(<Example values={{ email: 'refetched@example.com', displayName: 'Refetched User' }} />);

  await waitFor(() => {
    expect((screen.getByLabelText('email') as HTMLInputElement).value).toBe('user@example.com');
    expect((screen.getByLabelText('display name') as HTMLInputElement).value).toBe('Refetched User');
    expect(screen.getByLabelText('dirty').textContent).toBe('true');
  });
});

test('reset from a React event updates registered inputs and form state', async () => {
  function Example() {
    const { form, useFormState, useRegister } = useForm({ defaultValues: {
      email: '',
      displayName: '',
      newsletter: false,
    } });
    const [email, displayName, newsletter] = useRegister([
      { name: 'email' },
      { name: 'displayName' },
      { name: 'newsletter', type: 'checkbox' },
    ]);
    const state = useFormState();

    return (
      <>
        <input aria-label="email" {...email} />
        <input aria-label="display name" {...displayName} />
        <input aria-label="newsletter" {...newsletter} />
        <output aria-label="dirty">{String(state.isDirty)}</output>
        <button
          type="button"
          onClick={() => form.reset({
            email: 'server@example.com',
            displayName: 'Server Loaded User',
            newsletter: true,
          })}
        >
          Reset from query
        </button>
      </>
    );
  }

  render(<Example />);

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'user@example.com' } });
  await waitFor(() => expect(screen.getByLabelText('dirty').textContent).toBe('true'));

  fireEvent.click(screen.getByRole('button', { name: 'Reset from query' }));

  await waitFor(() => {
    expect((screen.getByLabelText('email') as HTMLInputElement).value).toBe('server@example.com');
    expect((screen.getByLabelText('display name') as HTMLInputElement).value).toBe('Server Loaded User');
    expect((screen.getByLabelText('newsletter') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText('dirty').textContent).toBe('false');
  });
});

test('useField returns props, field state, and setter without nested register', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });

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

test('useFieldState returns typed field state and permits unknown extension paths', async () => {
  type Values = {
    email: string;
    user: {
      name: string;
      age: number;
    };
    items: { title: string }[];
    profile?: {
      name: string;
    };
    'user.name': boolean;
  };

  const form = new CreateForm<Values>({
    defaultValues: {
      email: '',
      user: { name: '', age: 0 },
      items: [{ title: 'Initial' }],
      'user.name': false,
    },
  });

  function Example() {
    const { useFieldState } = useForm(form);
    const email = useFieldState('email');
    const nestedName = useFieldState(['user', 'name']);
    const nestedAge = useFieldState(['user', 'age']);
    const itemTitle = useFieldState(['items', 0, 'title']);
    const optionalName = useFieldState(['profile', 'name']);
    const literalDotName = useFieldState('user.name');
    const extension = useFieldState('nickname');

    expectTypeOf(email.value).toEqualTypeOf<string>();
    expectTypeOf(nestedName.value).toEqualTypeOf<string>();
    expectTypeOf(nestedAge.value).toEqualTypeOf<number>();
    expectTypeOf(itemTitle.value).toEqualTypeOf<string>();
    expectTypeOf(optionalName.value).toEqualTypeOf<string | undefined>();
    expectTypeOf(literalDotName.value).toEqualTypeOf<boolean>();
    expectTypeOf(extension.value).toEqualTypeOf<unknown>();

    return (
      <>
        <output aria-label="email">{String(email.value)}</output>
        <output aria-label="nested-name">{String(nestedName.value)}</output>
        <output aria-label="item-title">{String(itemTitle.value)}</output>
        <output aria-label="literal-dot-name">{String(literalDotName.value)}</output>
        <output aria-label="extension-dirty">{String(extension.dirty)}</output>
      </>
    );
  }

  render(<Example />);

  expect(screen.getByLabelText('email').textContent).toBe('');
  expect(screen.getByLabelText('nested-name').textContent).toBe('');
  expect(screen.getByLabelText('item-title').textContent).toBe('Initial');
  expect(screen.getByLabelText('literal-dot-name').textContent).toBe('false');

  form.setValue('nickname', 'Ada', { source: 'user' });

  await waitFor(() => expect(screen.getByLabelText('extension-dirty').textContent).toBe('true'));
});

test('useFieldState infers values from useForm options', () => {
  type Values = {
    email: string;
    user: {
      age: number;
    };
  };

  function Example({ values }: { values: Values }) {
    const { useFieldState } = useForm({
      defaultValues: {
        email: '',
        user: { age: 0 },
      },
      values,
    });
    const email = useFieldState('email');
    const age = useFieldState(['user', 'age']);
    const extension = useFieldState('nickname');

    expectTypeOf(email.value).toEqualTypeOf<string>();
    expectTypeOf(age.value).toEqualTypeOf<number>();
    expectTypeOf(extension.value).toEqualTypeOf<unknown>();

    return <output aria-label="email">{String(email.value)}</output>;
  }

  render(<Example values={{ email: 'server@example.com', user: { age: 42 } }} />);

  expect(screen.getByLabelText('email').textContent).toBe('server@example.com');
});

test('useRegister returns map-friendly bindings for an options array', () => {
  const form = new CreateForm({ defaultValues: {
    bio: '',
    agreed: false,
    color: 'red',
    role: 'user',
  } });

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
        <input aria-label="agreed" {...agreed} />
        <input aria-label="red" {...red} />
        <input aria-label="blue" {...blue} />
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
  const form = new CreateForm({ defaultValues: { color: 'red' } });

  function Example() {
    const { useRegister } = useForm(form);
    const [red, blue] = useRegister(
      { name: 'color', type: 'radio', value: 'red' },
      { name: 'color', type: 'radio', value: 'blue' },
    );

    return (
      <>
        <input aria-label="red" {...red} />
        <input aria-label="blue" {...blue} />
      </>
    );
  }

  render(<Example />);

  expect((screen.getByLabelText('red') as HTMLInputElement).type).toBe('radio');
  fireEvent.click(screen.getByLabelText('blue'));

  expect(form.getValue('color')).toBe('blue');
});

test('multiple select receives array value from restored container values on first render', () => {
  const form = new CreateForm({ defaultValues: {
    topics: ['state'],
  } });

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
  const form = new CreateForm({ defaultValues: { email: '' } });

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

test('handleSubmit prevents default form submit and passes valid values', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  let submittedEmail = '';

  function Example() {
    const { handleSubmit, useFormState, useRegister } = useForm(form);
    const email = useRegister({ name: 'email' });
    const state = useFormState();

    return (
      <form onSubmit={handleSubmit(values => {
        submittedEmail = values.email;
      })}>
        <input aria-label="email" {...email} />
        <output aria-label="submitted">{String(state.isSubmitted)}</output>
        <output aria-label="submit-successful">{String(state.isSubmitSuccessful)}</output>
        <button type="submit">Submit</button>
      </form>
    );
  }

  render(<Example />);

  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'ada@example.com' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);

  await waitFor(() => expect(submittedEmail).toBe('ada@example.com'));
  expect(form.getState().submitCount).toBe(1);
  expect(screen.getByLabelText('submitted').textContent).toBe('true');
  expect(screen.getByLabelText('submit-successful').textContent).toBe('true');
});

test('field-local schema overrides form-level schema for a registered field', async () => {
  const form = new CreateForm({
    defaultValues: { email: '' },
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

test('useRegister DOM focus/blur events drive isFocused state', async () => {
  const form = new CreateForm({ defaultValues: { email: '', name: '' } });

  function Example() {
    const { useRegister } = useForm(form);
    const email = useRegister({ name: 'email' });
    const name = useRegister({ name: 'name' });

    return (
      <>
        <input aria-label="email" {...email} />
        <input aria-label="name" {...name} />
      </>
    );
  }

  render(<Example />);

  expect(form.getFieldState('email').isFocused).toBe(false);

  fireEvent.focus(screen.getByLabelText('email'));
  await waitFor(() => expect(form.getFieldState('email').isFocused).toBe(true));

  fireEvent.focus(screen.getByLabelText('name'));
  await waitFor(() => expect(form.getFieldState('name').isFocused).toBe(true));

  fireEvent.blur(screen.getByLabelText('name'));
  await waitFor(() => {
    expect(form.getFieldState('name').isFocused).toBe(false);
    expect(form.getFieldState('name').touched).toBe(true);
  });
});

test('useFormState exposes focusedField aggregate', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });

  function Example() {
    const { useRegister, useFormState } = useForm(form);
    const email = useRegister({ name: 'email' });
    const state = useFormState();

    return (
      <>
        <input aria-label="email" {...email} />
        <output aria-label="focused">{state.focusedField === null ? 'none' : state.focusedField}</output>
      </>
    );
  }

  render(<Example />);

  await waitFor(() => expect(screen.getByLabelText('focused').textContent).toBe('none'));

  fireEvent.focus(screen.getByLabelText('email'));
  await waitFor(() => expect(screen.getByLabelText('focused').textContent).toBe('["email"]'));

  fireEvent.blur(screen.getByLabelText('email'));
  await waitFor(() => expect(screen.getByLabelText('focused').textContent).toBe('none'));
});
