# Solid login form example

This Vite + Solid + TypeScript example shows a simple email/password login form using the Solid adapter.

## What it demonstrates

- `useForm` with a pre-created `CreateForm` instance
- `useRegister` for reactive input binding via spread props
- Field-local Standard Schema validation on `blur` and `submit`
- `useFormState` for reactive form-wide state (called as `state()` signal)
- `handleSubmit` for type-safe submit callbacks

## Run

From the repository root:

```sh
pnpm --dir examples/solid-login-form install
pnpm --dir examples/solid-login-form dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/solid` to the local `src/` files, so it can run before the package is built.