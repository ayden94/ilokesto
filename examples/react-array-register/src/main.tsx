import { useForm } from '@ilokesto/form/react';
import { StrictMode } from 'react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type SignupValues = {
  email: string;
  displayName: string;
  newsletter: boolean;
  profile: {
    role: string;
  };
};

const serverValues: SignupValues = {
  email: 'server@example.com',
  displayName: 'Server Loaded User',
  newsletter: true,
  profile: {
    role: 'member',
  },
};

function ArrayUseRegisterExample() {
  const [queryValues, setQueryValues] = useState<SignupValues | undefined>();
  const { useRegister, form, useFieldState, useFormState, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      displayName: '',
      newsletter: false,
      profile: {
        role: 'visitor',
      },
    },
    values: queryValues,
    resetOptions: { keepDirtyValues: true },
  });
  const [email, displayName, newsletter] = useRegister([
    { name: 'email' },
    { name: 'displayName' },
    { name: 'newsletter', type: 'checkbox' },
  ]);
  const emailState = useFieldState('email');
  const newsletterState = useFieldState('newsletter');
  const profileRoleState = useFieldState(['profile', 'role']);
  const extensionState = useFieldState('marketingSource');
  const state = useFormState();

  const emailValue: string = emailState.value;
  const newsletterValue: boolean = newsletterState.value;
  const profileRoleValue: string = profileRoleState.value;

  return (
    <main className="page-shell">
      <section className="example-card" aria-labelledby="example-title">
        <p className="eyebrow">React + Vite + TypeScript</p>
        <h1 id="example-title">Array useRegister example</h1>
        <p className="description">
          One options tuple is passed to <code>useRegister</code>, and the returned tuple is
          destructured into field props. Load query data through the reactive <code>values</code>
          option while preserving dirty user edits.
        </p>

        <div className="toolbar" aria-label="Form actions">
          <button type="button" onClick={() => setQueryValues(serverValues)}>
            Load query result
          </button>
          <button type="button" onClick={() => form.setValue('marketingSource', 'landing-page', { source: 'user' })}>
            Set extension field
          </button>
          <span className="status-pill">isDirty: {String(state.isDirty)}</span>
          <span className="status-pill">submitCount: {state.submitCount}</span>
        </div>

        <div className="field-state-panel" aria-label="Typed useFieldState values">
          <strong>useFieldState</strong>
          <span>Email value: {emailValue || '(empty)'}</span>
          <span>Newsletter checked: {String(newsletterValue)}</span>
          <span>Profile role: {profileRoleValue}</span>
          <span>Unknown extension dirty: {String(extensionState.dirty)}</span>
        </div>

        <form
          className="form-grid"
          onSubmit={handleSubmit((values) => {
            window.alert(JSON.stringify(values, null, 2));
          })}
        >
          <label>
            Email
            <input {...email} placeholder="ada@example.com" />
          </label>

          <label>
            Display name
            <input {...displayName} placeholder="Ada Lovelace" />
          </label>

          <label className="checkbox-row">
            <input {...newsletter} />
            Receive product updates
          </label>

          <button type="submit" disabled={!state.isDirty}>
            Submit
          </button>
        </form>

        <pre aria-label="Current form values">{JSON.stringify({ values: form.getValues(), state: { isDirty: state.isDirty, dirtyFields: state.dirtyFields, touchedFields: state.touchedFields, submitCount: state.submitCount } }, null, 2)}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ArrayUseRegisterExample />
  </StrictMode>,
);
