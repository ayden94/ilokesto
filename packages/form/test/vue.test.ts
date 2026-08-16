import { computed, effectScope, nextTick, ref } from 'vue';
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
  const form = new CreateForm({ defaultValues: { email: '' } });
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
    const { form, useRegister } = useForm({ defaultValues: { email: 'ada@example.com' } });
    const email = useRegister({ name: 'email' });

    expect(email.value).toBe('ada@example.com');
    email.onInput(eventFor({ value: 'grace@example.com', type: 'text' }));
    expect(form.getValue('email')).toBe('grace@example.com');
  });

  scope.stop();
});

test('Vue useRegister returns binding arrays for array and rest options', () => {
  const form = new CreateForm({ defaultValues: {
    agreed: false,
    color: 'red',
    role: 'user',
  } });
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
  const form = new CreateForm({ defaultValues: { bio: '' } });
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
  const form = new CreateForm({ defaultValues: { topics: ['state'] } });
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
  const form = new CreateForm({ defaultValues: { email: '' } });
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
  const form = new CreateForm({ defaultValues: { email: 'ada@example.com' } });
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

test('Vue useForm syncs form values when ref values change', async () => {
  const values = ref({ email: 'init@example.com', name: 'Ada' });
  const scope = effectScope();

  let form: ReturnType<typeof useForm<{ email: string; name: string }>>['form'] | undefined;

  scope.run(() => {
    const result = useForm<{ email: string; name: string }>({
      defaultValues: { email: '', name: '' },
      values,
    });
    form = result.form;
  });

  expect(form!.getValues()).toEqual({ email: 'init@example.com', name: 'Ada' });

  values.value = { email: 'server@example.com', name: 'Grace' };
  await nextTick();

  expect(form!.getValues()).toEqual({ email: 'server@example.com', name: 'Grace' });
  scope.stop();
});

test('Vue useForm syncs form values when plain getter reads reactive source', async () => {
  const source = ref({ email: 'init@example.com' });
  const valuesGetter = () => source.value;
  const scope = effectScope();

  let form: ReturnType<typeof useForm<{ email: string }>>['form'] | undefined;

  scope.run(() => {
    const result = useForm<{ email: string }>({
      defaultValues: { email: '' },
      values: valuesGetter,
    });
    form = result.form;
  });

  expect(form!.getValues()).toEqual({ email: 'init@example.com' });

  source.value = { email: 'server@example.com' };
  await nextTick();

  expect(form!.getValues()).toEqual({ email: 'server@example.com' });
  scope.stop();
});

test('Vue useForm applies resetOptions when values change', async () => {
  const values = ref<{ email: string }>({ email: 'init@example.com' });
  const scope = effectScope();

  let form: ReturnType<typeof useForm<{ email: string }>>['form'] | undefined;

  scope.run(() => {
    const result = useForm<{ email: string }>({
      defaultValues: { email: '' },
      values,
      resetOptions: { keepTouched: true },
    });
    form = result.form;

    form!.blur('email');
    expect(form!.getFieldState('email').touched).toBe(true);
  });

  values.value = { email: 'server@example.com' };
  await nextTick();

  expect(form!.getValues()).toEqual({ email: 'server@example.com' });
  expect(form!.getFieldState('email').touched).toBe(true);
  scope.stop();
});

test('Vue useForm accepts computed ref as values', async () => {
  const source = ref('a@example.com');
  const values = computed(() => ({ email: source.value }));
  const scope = effectScope();

  let form: ReturnType<typeof useForm<{ email: string }>>['form'] | undefined;

  scope.run(() => {
    const result = useForm<{ email: string }>({
      defaultValues: { email: '' },
      values,
    });
    form = result.form;
  });

  expect(form!.getValues()).toEqual({ email: 'a@example.com' });

  source.value = 'b@example.com';
  await nextTick();

  expect(form!.getValues()).toEqual({ email: 'b@example.com' });
  scope.stop();
});
