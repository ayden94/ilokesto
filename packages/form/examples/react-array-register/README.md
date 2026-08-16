# React array `useRegister` example

This Vite + React + TypeScript example shows the array overload of `useRegister`.
It also demonstrates reactive `values` hydration by simulating a query result load.
It includes `useFieldState(name)` so typed field-state reads can be checked in the example app.

It also uses the options overload of `useForm`, so the form can be created directly inside the component:

```tsx
const { useRegister, useFieldState, handleSubmit } = useForm({
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
```

Known paths infer their value type from `defaultValues` / `values`, while extension paths are still allowed:

```tsx
const emailState = useFieldState('email');
const roleState = useFieldState(['profile', 'role']);
const extensionState = useFieldState('marketingSource');

const emailValue: string = emailState.value;
const roleValue: string = roleState.value;

// `marketingSource` is not part of SignupValues, so its value type is unknown,
// but the field can still be created at runtime.
form.setValue('marketingSource', 'landing-page', { source: 'user' });
console.log(extensionState.dirty);
```

```tsx
const registerOptions = [
  { name: 'email' },
  { name: 'displayName' },
  { name: 'newsletter', type: 'checkbox' },
] as const satisfies readonly RegisterOptions[];

const [email, displayName, newsletter] = useRegister(registerOptions);
```

```tsx
setQueryValues({
  email: 'server@example.com',
  displayName: 'Server Loaded User',
  newsletter: true,
  profile: {
    role: 'member',
  },
});
```

Run it from the repository root:

```sh
pnpm --dir packages/form/examples/react-array-register install
pnpm --dir packages/form/examples/react-array-register dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/react` to the local `src/` files, so it can run before the package is built.
