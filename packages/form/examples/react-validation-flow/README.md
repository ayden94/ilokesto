# React validation flow example

This Vite + React + TypeScript example demonstrates sync and async validation with `validateOn: ['change', 'blur', 'submit']`.

## What it demonstrates

- `useForm` with inline options (no pre-created `CreateForm` instance)
- `useField` for field binding with reactive `value`, `errors`, `dirty`, and `touched`
- Async Standard Schema validators that simulate server-side checks with a delay
- `validateOn: ['change', 'blur', 'submit']` so fields validate on every keystroke, blur, and submit
- `useFormState` for form-wide state (isDirty, isValid, submitCount)
- `handleSubmit` with type-safe onValid callback

Async validation supersedes only overlapping field targets. Stale results are discarded, and submit validation retries against the latest values before invoking `onValid`.

## Run

From the repository root:

```sh
pnpm --dir packages/form/examples/react-validation-flow install
pnpm --dir packages/form/examples/react-validation-flow dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/react` to the local `src/` files, so it can run before the package is built.
