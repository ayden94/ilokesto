import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/react';
import { useState } from 'react';
import './styles.css';

type FormValues = {
  username: string;
  email: string;
};

const DELAY_MS = 400;

function asyncCheck(
  check: (value: string) => string | null,
): {
  '~standard': {
    version: 1;
    vendor: 'example-async';
    validate: (value: unknown) => Promise<{ value: unknown } | { issues: { message: string; path: never[] }[] }>;
  };
} {
  return {
    '~standard': {
      version: 1,
      vendor: 'example-async',
      async validate(value: unknown) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        const message = check(typeof value === 'string' ? value : '');
        if (message) {
          return { issues: [{ message, path: [] }] };
        }
        return { value };
      },
    },
  };
}

const usernameSchema = asyncCheck((v) => {
  if (v.trim().length < 3) return 'Username must be at least 3 characters';
  if (!/^[a-z]/.test(v)) return 'Username must start with a lowercase letter';
  return null;
});

const emailSchema = asyncCheck((v) => {
  if (v.trim() === '') return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  return null;
});

function ValidationFlowExample() {
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const { useField, useFormState, handleSubmit } = useForm<FormValues>({
    defaultValues: { username: '', email: '' },
    validateOn: ['change', 'blur', 'submit'],
  });

  const username = useField({ name: 'username', schema: usernameSchema });
  const email = useField({ name: 'email', schema: emailSchema });
  const state = useFormState();

  return (
    <main className="page-shell">
      <section className="example-card" aria-labelledby="example-title">
        <p className="eyebrow">React + Vite + TypeScript</p>
        <h1 id="example-title">Validation flow example</h1>
        <p className="description">
          Demonstrates <code>validateOn: ['change', 'blur', 'submit']</code> with async
          Standard Schema validators. Each field validates on every keystroke (change),
          blur, and submit. The async schemas simulate server-side checks with a
          {DELAY_MS}ms delay.
        </p>

        <form
          className="form-grid"
          onSubmit={handleSubmit(
            (values) => setSubmitted(values),
          )}
        >
          <label>
            Username
            <input {...username.props} placeholder="e.g. ada" />
            <span className="field-hint">Validates on change, blur, and submit</span>
            {username.errors.length > 0 && (
              <ul className="field-errors">
                {username.errors.map((e) => (
                  <li key={e.message}>{e.message}</li>
                ))}
              </ul>
            )}
          </label>

          <label>
            Email
            <input {...email.props} placeholder="ada@example.com" />
            <span className="field-hint">Validates on change, blur, and submit</span>
            {email.errors.length > 0 && (
              <ul className="field-errors">
                {email.errors.map((e) => (
                  <li key={e.message}>{e.message}</li>
                ))}
              </ul>
            )}
          </label>

          <div className="status-bar">
            <span className="status-pill">isDirty: {String(state.isDirty)}</span>
            <span className="status-pill">isValid: {String(state.isValid)}</span>
            <span className="status-pill">submitCount: {state.submitCount}</span>
          </div>

          <button type="submit" disabled={!state.isDirty}>
            Submit
          </button>
        </form>

        {submitted && (
          <div className="result-panel">
            <strong>Submitted values</strong>
            <pre>{JSON.stringify(submitted, null, 2)}</pre>
            <button type="button" onClick={() => setSubmitted(null)}>
              Clear result
            </button>
          </div>
        )}

        <pre>{JSON.stringify({
          values: { username: username.value, email: email.value },
          isDirty: state.isDirty,
          isValid: state.isValid,
          submitCount: state.submitCount,
          dirtyFields: state.dirtyFields,
          touchedFields: state.touchedFields,
        }, null, 2)}</pre>
      </section>
    </main>
  );
}

export default ValidationFlowExample;