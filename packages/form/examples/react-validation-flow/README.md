# React validation flow example

This Vite + React + TypeScript example demonstrates sync and async validation with `validateOn: ['change', 'blur', 'submit']`.

## What it demonstrates

- `useForm` with inline options (no pre-created `CreateForm` instance)
- `useField` for field binding with reactive `value`, `errors`, `dirty`, and `touched`
- Async Standard Schema validators that simulate server-side checks with a delay
- `validateOn: ['change', 'blur', 'submit']` so fields validate on every keystroke, blur, and submit
- `useFormState` for form-wide state (isDirty, isValid, submitCount)
- `handleSubmit` with type-safe onValid callback

Async validation uses a generation counter internally, so rapid typing always reflects the most recent values. Stale async results are discarded.

## Run

From the repository root:

```sh
pnpm --dir examples/react-validation-flow install
pnpm --dir examples/react-validation-flow dev
```

The example aliases `@ilokesto/form` and `@ilokesto/form/react` to the local `src/` files, so it can run before the package is built.