import { createRoot } from 'solid-js';
import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import { useForm } from '../src/solid/index';

const standardSchema = (validate: (value: any) => any) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate,
  },
});

function eventFor<TElement extends HTMLElement>(target: Record<string, unknown>): Event & { currentTarget: TElement } {
  return { currentTarget: target as TElement } as Event & { currentTarget: TElement };
}

test('Solid useRegister binds text input through input events', () => {
  const form = new CreateForm({ initialValues: { email: '' } });

  createRoot(dispose => {
    const { useRegister } = useForm(form);
    const email = useRegister({ name: 'email' });

    expect(email.type).toBe('text');
    email.onInput(eventFor<HTMLInputElement>({ value: 'ada@example.com', type: 'text' }) as InputEvent & { currentTarget: HTMLInputElement });

    expect(form.getValue('email')).toBe('ada@example.com');
    expect(form.getFieldState('email').dirty).toBe(true);
    dispose();
  });
});

test('Solid useForm accepts form options', () => {
  createRoot(dispose => {
    const { form, useRegister } = useForm({ initialValues: { email: 'ada@example.com' } });
    const email = useRegister({ name: 'email' });

    expect(email.value).toBe('ada@example.com');
    email.onInput(eventFor<HTMLInputElement>({ value: 'grace@example.com', type: 'text' }) as InputEvent & { currentTarget: HTMLInputElement });
    expect(form.getValue('email')).toBe('grace@example.com');
    dispose();
  });
});

test('Solid useRegister returns binding arrays for array and rest options', () => {
  const form = new CreateForm({ initialValues: { agreed: false, color: 'red', role: 'user' } });

  createRoot(dispose => {
    const { useRegister } = useForm(form);
    const [agreed] = useRegister([{ name: 'agreed', type: 'checkbox' }]);
    const role = useRegister<HTMLSelectElement>({ name: 'role' });
    const [red, blue] = useRegister(
      { name: 'color', type: 'radio', value: 'red' },
      { name: 'color', type: 'radio', value: 'blue' },
    );

    agreed.onChange(eventFor<HTMLInputElement>({ checked: true, type: 'checkbox' }));
    blue.onChange(eventFor<HTMLInputElement>({ checked: true, type: 'radio', value: 'blue' }));
    role.onChange(eventFor<HTMLSelectElement>({ value: 'admin' }));

    expect(red.type).toBe('radio');
    expect(red.checked).toBe(false);
    expect(blue.checked).toBe(true);
    expect(form.getValues()).toEqual({ agreed: true, color: 'blue', role: 'admin' });
    dispose();
  });
});

test('Solid useField exposes reactive getters and setter', () => {
  const form = new CreateForm({ initialValues: { bio: '' } });

  createRoot(dispose => {
    const { useField } = useForm(form);
    const bio = useField<HTMLTextAreaElement>({ name: 'bio' });

    expect(bio.value).toBe('');
    bio.setValue('hello');

    expect(bio.value).toBe('hello');
    expect(bio.dirty).toBe(true);
    expect(bio.props.value).toBe('hello');
    dispose();
  });
});

test('Solid multiple select receives restored array values and writes selected options', () => {
  const form = new CreateForm({ initialValues: { topics: ['state'] } });

  createRoot(dispose => {
    const { useField } = useForm(form);
    const topics = useField<HTMLSelectElement>({ name: 'topics' });

    expect(topics.value).toEqual(['state']);
    expect(topics.props.value).toEqual(['state']);

    topics.props.onChange(eventFor<HTMLSelectElement>({
      multiple: true,
      selectedOptions: [{ value: 'state' }, { value: 'solid' }],
    }));

    expect(form.getValues()).toEqual({ topics: ['state', 'solid'] });
    dispose();
  });
});

test('Solid useFormState exposes aggregate state', () => {
  const form = new CreateForm({ initialValues: { email: '' } });

  createRoot(dispose => {
    const { useRegister, useFormState } = useForm(form);
    const email = useRegister({ name: 'email' });
    const state = useFormState();

    form.setErrors('email', [{ message: 'Required' }]);
    expect(state.isValid).toBe(false);

    email.onInput(eventFor<HTMLInputElement>({ value: 'ada@example.com', type: 'text' }) as InputEvent & { currentTarget: HTMLInputElement });
    expect(state.isDirty).toBe(true);

    email.onBlur(eventFor<HTMLInputElement>({}) as FocusEvent & { currentTarget: HTMLInputElement });
    expect(state.touchedFields).toEqual({ '["email"]': true });
    dispose();
  });
});

test('Solid handleSubmit prevents default submit and passes valid values', async () => {
  const form = new CreateForm({ initialValues: { email: 'ada@example.com' } });
  let submittedEmail = '';
  let preventDefaultCount = 0;
  let submitPromise: Promise<void | undefined> | undefined;

  createRoot(dispose => {
    const { handleSubmit } = useForm(form);
    const submit = handleSubmit(values => {
      submittedEmail = values.email;
    });

    submitPromise = submit({ preventDefault: () => { preventDefaultCount += 1; } } as Event);
    dispose();
  });

  await submitPromise;

  expect(preventDefaultCount).toBe(1);
  expect(submittedEmail).toBe('ada@example.com');
  expect(form.getState().submitCount).toBe(1);
});

test('Solid field-local schema overrides form-level schema', async () => {
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

  const dispose = createRoot(disposeRoot => {
    const { useField } = useForm(form);
    useField({ name: 'email', schema: emailSchema });

    return disposeRoot;
  });

  await form.blur('email');
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Field-level error']);

  dispose();
  await form.trigger('email');
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Form-level error']);
});
