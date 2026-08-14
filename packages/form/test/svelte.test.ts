// @vitest-environment jsdom
import { get } from 'svelte/store';
import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import { useForm } from '../src/svelte/index';

const standardSchema = (validate: (value: any) => any) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate,
  },
});

test('Svelte register action binds text input through input events', () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  const { register } = useForm(form);
  const input = document.createElement('input');
  const action = register(input, { name: 'email' });

  expect(input.name).toBe('email');
  expect(input.type).toBe('text');

  input.value = 'ada@example.com';
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));

  expect(form.getValue('email')).toBe('ada@example.com');
  expect(form.getFieldState('email').dirty).toBe(true);

  action?.destroy?.();
});

test('Svelte useForm accepts form options', () => {
  const { form, register } = useForm({ defaultValues: { email: 'ada@example.com' } });
  const input = document.createElement('input');
  const action = register(input, { name: 'email' });

  expect(input.value).toBe('ada@example.com');

  input.value = 'grace@example.com';
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));

  expect(form.getValue('email')).toBe('grace@example.com');
  action?.destroy?.();
});

test('Svelte register action handles checkbox, radio, and select', () => {
  const form = new CreateForm({ defaultValues: { agreed: false, color: 'red', role: 'user' } });
  const { register } = useForm(form);
  const agreed = document.createElement('input');
  const blue = document.createElement('input');
  const select = document.createElement('select');
  const user = new Option('User', 'user');
  const admin = new Option('Admin', 'admin');

  agreed.type = 'checkbox';
  blue.type = 'radio';
  select.append(user, admin);

  const agreedAction = register(agreed, { name: 'agreed', type: 'checkbox' });
  const blueAction = register(blue, { name: 'color', type: 'radio', value: 'blue' });
  const selectAction = register(select, { name: 'role' });

  agreed.checked = true;
  agreed.dispatchEvent(new Event('change', { bubbles: true }));
  blue.checked = true;
  blue.dispatchEvent(new Event('change', { bubbles: true }));
  select.value = 'admin';
  select.dispatchEvent(new Event('change', { bubbles: true }));

  expect(form.getValues()).toEqual({ agreed: true, color: 'blue', role: 'admin' });
  expect(blue.checked).toBe(true);

  agreedAction?.destroy?.();
  blueAction?.destroy?.();
  selectAction?.destroy?.();
});

test('Svelte register action syncs multiple select array values', () => {
  const form = new CreateForm({ defaultValues: { topics: ['state'] } });
  const { register } = useForm(form);
  const select = document.createElement('select');
  const state = new Option('State', 'state');
  const svelte = new Option('Svelte', 'svelte');

  select.multiple = true;
  select.append(state, svelte);

  const action = register(select, { name: 'topics' });

  expect(state.selected).toBe(true);
  expect(svelte.selected).toBe(false);

  svelte.selected = true;
  select.dispatchEvent(new Event('change', { bubbles: true }));

  expect(form.getValues()).toEqual({ topics: ['state', 'svelte'] });

  action?.destroy?.();
});

test('Svelte useFormState returns a readable aggregate store', () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  const { useFormState } = useForm(form);
  const state = useFormState();

  expect(get(state).isValid).toBe(true);
  expect(get(state).isSubmitting).toBe(false);
  expect(get(state).isSubmitted).toBe(false);
  expect(get(state).isSubmitSuccessful).toBe(false);

  form.setErrors('email', [{ message: 'Required' }]);
  expect(get(state).isValid).toBe(false);

  form.setValue('email', 'ada@example.com', { source: 'user' });
  expect(get(state).isDirty).toBe(true);
});

test('Svelte handleSubmit prevents default submit and passes valid values', async () => {
  const form = new CreateForm({ defaultValues: { email: 'ada@example.com' } });
  const { handleSubmit } = useForm(form);
  let submittedEmail = '';
  let preventDefaultCount = 0;

  const submit = handleSubmit(values => {
    submittedEmail = values.email;
  });

  await submit({ preventDefault: () => { preventDefaultCount += 1; } } as Event);

  expect(preventDefaultCount).toBe(1);
  expect(submittedEmail).toBe('ada@example.com');
  expect(form.getState().submitCount).toBe(1);
  expect(form.getState().isSubmitted).toBe(true);
  expect(form.getState().isSubmitSuccessful).toBe(true);
});

test('Svelte field-local schema overrides form-level schema while action is alive', async () => {
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
  const { register } = useForm(form);
  const input = document.createElement('input');
  const action = register(input, { name: 'email', schema: emailSchema });

  await form.blur('email');
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Field-level error']);

  action?.destroy?.();
  await form.trigger('email');
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Form-level error']);
});
