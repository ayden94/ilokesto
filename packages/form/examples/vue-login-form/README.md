# Vue login form example

This Vite + Vue 3 + TypeScript example shows a simple email/password login form using the Vue adapter.

## What it demonstrates

- `useForm` with a pre-created `CreateForm` instance
- `useRegister` for field binding with `v-bind` spread
- Field-local Standard Schema validation on `blur` and `submit`
- `useFormState` for reactive form-wide state (isDirty, isValid, submitCount)
- `handleSubmit` for type-safe submit callbacks

## Run

From the repository root:

```sh
pnpm --dir examples/vue-login-form install
pnpm --dir examples/vue-login-form dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/vue` to the local `src/` files, so it can run before the package is built.