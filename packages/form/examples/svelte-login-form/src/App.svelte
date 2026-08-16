<script lang="ts">
  import { CreateForm } from '@ilokesto/form';
  import { useForm } from '@ilokesto/form/svelte';

  type LoginValues = { email: string; password: string };

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

  const form = new CreateForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    validateOn: ['blur', 'submit'],
  });

  const { register, useFormState, handleSubmit } = useForm(form);
  const state = useFormState();

  const onSubmit = handleSubmit(
    (values) => window.alert(JSON.stringify(values, null, 2)),
  );
</script>

<main class="page-shell">
  <section class="example-card" aria-labelledby="example-title">
    <p class="eyebrow">Svelte 5 + Vite + TypeScript</p>
    <h1 id="example-title">Login form example</h1>
    <p class="description">
      Email and password fields with field-local Standard Schema validation.
      Uses the <code>register</code> action, <code>useFormState</code> readable store,
      and <code>handleSubmit</code> from the Svelte adapter.
    </p>

    <form class="form-grid" onsubmit={onSubmit}>
      <label>
        Email
        <input use:register={{ name: 'email', schema: emailSchema }} placeholder="ada@example.com" />
      </label>

      <label>
        Password
        <input use:register={{ name: 'password', type: 'password', schema: passwordSchema }} placeholder="At least 6 characters" />
      </label>

      <button type="submit" disabled={!$state.isDirty || !$state.isValid}>
        Log in
      </button>
    </form>

    <pre>{JSON.stringify({ values: form.getValues(), isDirty: $state.isDirty, isValid: $state.isValid, submitCount: $state.submitCount }, null, 2)}</pre>
  </section>
</main>

<style>
  :root {
    color: #172033;
    background: #f4f7fb;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  button, input { font: inherit; }

  .page-shell {
    display: grid;
    min-height: 100vh;
    place-items: center;
    padding: 32px;
  }

  .example-card {
    width: min(100%, 560px);
    padding: 32px;
    border: 1px solid #dce4f0;
    border-radius: 24px;
    background: #ffffff;
    box-shadow: 0 24px 70px rgb(23 32 51 / 12%);
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #54617a;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 { margin: 0; font-size: clamp(2rem, 7vw, 3rem); line-height: 1; }

  .description {
    margin: 16px 0 28px;
    color: #54617a;
    line-height: 1.6;
  }

  .form-grid { display: grid; gap: 16px; }

  label {
    display: grid;
    gap: 8px;
    color: #2b3448;
    font-weight: 700;
  }

  input {
    width: 100%;
    border: 1px solid #c9d4e5;
    border-radius: 12px;
    padding: 12px 14px;
    color: #172033;
    background: #f9fbff;
  }

  input:focus-visible {
    border-color: #4f7cff;
    outline: 3px solid rgb(79 124 255 / 20%);
  }

  button {
    border: 0;
    border-radius: 12px;
    padding: 12px 16px;
    color: #ffffff;
    background: #345cf6;
    font-weight: 800;
    cursor: pointer;
  }

  button:disabled {
    background: #aab4c8;
    cursor: not-allowed;
  }

  pre {
    margin: 24px 0 0;
    overflow: auto;
    border-radius: 16px;
    padding: 16px;
    color: #dce7ff;
    background: #172033;
  }
</style>