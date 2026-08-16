import { CreateForm } from '@ilokesto/form';
import type { Form } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/solid';
import './styles.css';

type LoginValues = {
  email: string;
  password: string;
};

const emailSchema = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(value: unknown) {
      if (typeof value !== 'string' || value.trim() === '') {
        return { issues: [{ message: 'Email is required', path: [] }] };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { issues: [{ message: 'Enter a valid email address', path: [] }] };
      }
      return { value };
    },
  },
};

const passwordSchema = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(value: unknown) {
      if (typeof value !== 'string' || value.length === 0) {
        return { issues: [{ message: 'Password is required', path: [] }] };
      }
      if (value.length < 6) {
        return { issues: [{ message: 'Password must be at least 6 characters', path: [] }] };
      }
      return { value };
    },
  },
};

const form: Form<LoginValues> = new CreateForm({
  defaultValues: { email: '', password: '' },
  validateOn: ['blur', 'submit'],
});

export default function App() {
  const { useRegister, useFormState, handleSubmit } = useForm(form);
  const email = useRegister({ name: 'email', schema: emailSchema });
  const password = useRegister({ name: 'password', type: 'password', schema: passwordSchema });
  const state = useFormState();

  const onSubmit = handleSubmit(
    (values) => window.alert(JSON.stringify(values, null, 2)),
  );

  return (
    <main class="page-shell">
      <section class="example-card" aria-labelledby="example-title">
        <p class="eyebrow">Solid + Vite + TypeScript</p>
        <h1 id="example-title">Login form example</h1>
        <p class="description">
          Email and password fields with field-local Standard Schema validation.
          Uses <code>useRegister</code>, <code>useFormState</code>, and
          <code>handleSubmit</code> from the Solid adapter.
        </p>

        <form class="form-grid" onSubmit={onSubmit}>
          <label>
            Email
            <input {...email} placeholder="ada@example.com" />
          </label>

          <label>
            Password
            <input {...password} placeholder="At least 6 characters" />
          </label>

          <button type="submit" disabled={!state().isDirty || !state().isValid}>
            Log in
          </button>
        </form>

        <pre>{JSON.stringify({
          values: form.getValues(),
          isDirty: state().isDirty,
          isValid: state().isValid,
          submitCount: state().submitCount,
        }, null, 2)}</pre>
      </section>
    </main>
  );
}