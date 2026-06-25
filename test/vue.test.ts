import { effectScope } from 'vue';
import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import { useForm } from '../src/vue/index';

const standardSchema = (validate: (value: any) => any) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate,
  },
});

function eventFor(target: Record<string, unknown>): Event & { currentTarget: HTMLElement } {
  return { currentTarget: target as HTMLElement } as Event & { currentTarget: HTMLElement };
}

test('Vue useRegister binds text input through input events', () => {
  const form = new CreateForm({ initialValues: { email: '' } });
  const scope = effectScope();

  scope.run(() => {
    const { useRegister } = useForm(form);
    const email = useRegister({ name: 'email' });

    expect(email.type).toBe('text');
    email.onInput(eventFor({ value: 'ada@example.com', type: 'text' }));
  });

  expect(form.getValue('email')).toBe('ada@example.com');
  expect(form.getFieldState('email').dirty).toBe(true);
  scope.stop();
});

test('Vue useForm accepts form options', () => {
  const scope = effectScope();

  scope.run(() => {
    const { form, useRegister } = useForm({ initialValues: { email: 'ada@example.com' } });
    const email = useRegister({ name: 'email' });

    expect(email.value).toBe('ada@example.com');
    email.onInput(eventFor({ value: 'grace@example.com', type: 'text' }));
    expect(form.getValue('email')).toBe('grace@example.com');
  });

  scope.stop();
});

test('Vue useRegister returns binding arrays for array and rest options', () => {
  const form = new CreateForm({
    initialValues: {
      agreed: false,
      color: 'red',
      role: 'user',
    },
  });
  const scope = effectScope();

  scope.run(() => {
    const { useRegister } = useForm(form);
    const [agreed] = useRegister([{ name: 'agreed', type: 'checkbox' }]);
    const role = useRegister<HTMLSelectElement>({ name: 'role' });
    const [red, blue] = useRegister(
      { name: 'color', type: 'radio', value: 'red' },
      { name: 'color', type: 'radio', value: 'blue' },
    );

    agreed.onChange(eventFor({ checked: true, type: 'checkbox' }));
    blue.onChange(eventFor({ checked: true, type: 'radio', value: 'blue' }));
    role.onChange(eventFor({ value: 'admin' }));

    expect(red.type).toBe('radio');
    expect(red.checked).toBe(false);
    expect(blue.checked).toBe(true);
  });

  expect(form.getValues()).toEqual({
    agreed: true,
    color: 'blue',
    role: 'admin',
  });
  scope.stop();
});

test('Vue useField exposes reactive getters and setter', () => {
  const form = new CreateForm({ initialValues: { bio: '' } });
  const scope = effectScope();

  scope.run(() => {
    const { useField } = useForm(form);
    const bio = useField<HTMLTextAreaElement>({ name: 'bio' });

    expect(bio.value).toBe('');
    bio.setValue('hello');

    expect(bio.value).toBe('hello');
    expect(bio.dirty).toBe(true);
    expect(bio.props.value).toBe('hello');
  });

  scope.stop();
});

test('Vue multiple select receives restored array values and writes selected options', () => {
  const form = new CreateForm({ initialValues: { topics: ['state'] } });
  const scope = effectScope();

  scope.run(() => {
    const { useField } = useForm(form);
    const topics = useField<HTMLSelectElement>({ name: 'topics' });

    expect(topics.value).toEqual(['state']);
    expect(topics.props.value).toEqual(['state']);

    topics.props.onChange(eventFor({
      multiple: true,
      selectedOptions: [{ value: 'state' }, { value: 'vue' }],
    }));
  });

  expect(form.getValues()).toEqual({ topics: ['state', 'vue'] });
  scope.stop();
});

test('Vue useFormState exposes aggregate state', () => {
  const form = new CreateForm({ initialValues: { email: '' } });
  const scope = effectScope();

  scope.run(() => {
    const { useRegister, useFormState } = useForm(form);
    const email = useRegister({ name: 'email' });
    const state = useFormState();

    form.setErrors('email', [{ message: 'Required' }]);
    expect(state.isValid).toBe(false);
    expect(state.isSubmitting).toBe(false);
    expect(state.isSubmitted).toBe(false);
    expect(state.isSubmitSuccessful).toBe(false);

    email.onInput(eventFor({ value: 'ada@example.com', type: 'text' }));
    expect(state.isDirty).toBe(true);

    email.onBlur(eventFor({}) as FocusEvent & { currentTarget: HTMLInputElement });
    expect(state.touchedFields).toEqual({ '["email"]': true });
  });

  scope.stop();
});

test('Vue handleSubmit prevents default submit and passes valid values', async () => {
  const form = new CreateForm({ initialValues: { email: 'ada@example.com' } });
  const scope = effectScope();
  let submittedEmail = '';
  let preventDefaultCount = 0;
  let submitPromise: Promise<void | undefined> | undefined;

  scope.run(() => {
    const { handleSubmit } = useForm(form);
    const submit = handleSubmit(values => {
      submittedEmail = values.email;
    });

    submitPromise = submit({ preventDefault: () => { preventDefaultCount += 1; } } as Event);
  });

  await submitPromise;

  expect(preventDefaultCount).toBe(1);
  expect(submittedEmail).toBe('ada@example.com');
  expect(form.getState().submitCount).toBe(1);
  expect(form.getState().isSubmitted).toBe(true);
  expect(form.getState().isSubmitSuccessful).toBe(true);
  scope.stop();
});

test('Vue field-local schema overrides form-level schema', async () => {
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
  const scope = effectScope();

  scope.run(() => {
    const { useField } = useForm(form);
    useField({ name: 'email', schema: emailSchema });
  });

  await form.blur('email');
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Field-level error']);

  scope.stop();
  await form.trigger('email');
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Form-level error']);
});
