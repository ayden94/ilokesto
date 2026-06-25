import { useForm } from '@ilokesto/form/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type SignupValues = {
  email: string;
  displayName: string;
  newsletter: boolean;
};

const serverValues: SignupValues = {
  email: 'server@example.com',
  displayName: 'Server Loaded User',
  newsletter: true,
};

function ArrayUseRegisterExample() {
  const { useRegister, form, useFormState, handleSubmit } = useForm<SignupValues>({ defaultValues: {
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
    <main className="page-shell">
      <section className="example-card" aria-labelledby="example-title">
        <p className="eyebrow">React + Vite + TypeScript</p>
        <h1 id="example-title">Array useRegister example</h1>
        <p className="description">
          One options tuple is passed to <code>useRegister</code>, and the returned tuple is
          destructured into field props. Use the reset button to simulate hydrating a query result.
        </p>

        <div className="toolbar" aria-label="Form actions">
          <button type="button" onClick={() => form.reset(serverValues)}>
            Load query result with reset
          </button>
          <span className="status-pill">isDirty: {String(state.isDirty)}</span>
          <span className="status-pill">submitCount: {state.submitCount}</span>
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
