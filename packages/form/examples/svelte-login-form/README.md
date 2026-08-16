# Svelte login form example

This Vite + Svelte 5 + TypeScript example shows a simple email/password login form using the Svelte adapter.

## What it demonstrates

- `useForm` with a pre-created `CreateForm` instance
- `register` Svelte action for DOM binding via `use:register`
- Field-local Standard Schema validation on `blur` and `submit`
- `useFormState` as a Svelte readable store (accessed with `$state` prefix)
- `handleSubmit` for type-safe submit callbacks

## Run

From the repository root:

```sh
pnpm --dir examples/svelte-login-form install
pnpm --dir examples/svelte-login-form dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/svelte` to the local `src/` files, so it can run before the package is built.