# React array `useRegister` example

This Vite + React + TypeScript example shows the array overload of `useRegister`.
It also demonstrates `form.reset(nextValues)` by simulating a query result load.

It also uses the options overload of `useForm`, so the form can be created directly inside the component:

```tsx
const { useRegister, handleSubmit } = useForm({
  defaultValues: {
    email: '',
    displayName: '',
    newsletter: false,
  },
});
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
form.reset({
  email: 'server@example.com',
  displayName: 'Server Loaded User',
  newsletter: true,
});
```

Run it from the repository root:

```sh
pnpm --dir examples/react-array-register install
pnpm --dir examples/react-array-register dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/react` to the local `src/` files, so it can run before the package is built.
