# @ilokesto/form

English | [한국어](./README.ko.md)

`@ilokesto/form` is a framework-agnostic form state core. It keeps form values, field metadata, validation errors, submit attempts, and array item keys in one normalized store, while leaving rendering and event binding to framework adapters.

The package is designed around five ideas:

1. **Framework independence**: the core exposes a plain TypeScript class, `CreateForm`, and does not import React, Vue, Svelte, Solid, or DOM APIs.
2. **Tuple paths, not dot paths**: a string such as `"user.name"` is a literal field name; nested paths are expressed as tuples such as `["user", "name"]`.
3. **Normalized field state**: nested values are split into leaf `FieldState` records and reconstructed when `getValues()` is called.
4. **Standard Schema validation**: the core depends only on the Standard Schema v1 `~standard.validate` contract, not on a specific schema library.
5. **Array rebasing**: when array items move, swap, insert, or disappear, child field metadata such as `errors`, `touched`, `dirty`, and `modified` is moved with the item.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [React adapter](#react-adapter)
- [Vue adapter](#vue-adapter)
- [Solid adapter](#solid-adapter)
- [Svelte adapter](#svelte-adapter)
- [Core concepts](#core-concepts)
- [API guide](#api-guide)
- [Runtime flows](#runtime-flows)
- [Internal architecture](#internal-architecture)
- [Core walkthrough](#core-walkthrough)
- [Design decisions](#design-decisions)
- [Testing and development](#testing-and-development)

## Installation

This package is published to npm under the `@ilokesto/form` name with public access. In a workspace, add it through your package manager or workspace protocol. When the package is published or linked, the import surface is:

```ts
import { CreateForm } from '@ilokesto/form';
```

Local development commands:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

The package emits ESM JavaScript and TypeScript declarations to `dist/`.

## Quick start

```ts
import { CreateForm } from '@ilokesto/form';

type LoginValues = {
  email: string;
  profile: {
    name: string;
  };
};

const form = new CreateForm<LoginValues>({
  defaultValues: {
    email: '',
    profile: {
      name: 'Ada',
    },
  },
});

form.setValue('email', 'ada@example.com', { source: 'user' });
form.setValue(['profile', 'name'], 'Grace', { source: 'user' });

console.log(form.getFieldState('email'));
console.log(form.getValues());
```

Important path rule:

```ts
form.setValue(['profile', 'name'], 'Grace');
form.setValue('profile.name', 'literal field');
```

These are different fields. `['profile', 'name']` means the nested `profile.name` value. `'profile.name'` means a top-level field whose actual key contains a dot.

## React adapter

React bindings are exposed through the `./react` subpath so the root package stays framework-agnostic.

```tsx
import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/react';

const form = new CreateForm({
  defaultValues: {
    email: '',
    remember: false,
  },
  validateOn: ['blur', 'submit'],
});

function LoginForm() {
  const {
    useRegister,
    useField,
    useFormState,
  } = useForm(form);

  const email = useField({ name: 'email', schema: emailSchema });
  const remember = useRegister({ name: 'remember', type: 'checkbox' });
  const [role] = useRegister<HTMLSelectElement>([{ name: 'role' }]);
  const state = useFormState();

  return (
    <form>
      <input {...email.props} />
      {email.errors.map(error => <p key={error.message}>{error.message}</p>)}

      <label>
        <input type="checkbox" {...remember} />
        Remember me
      </label>

      <select {...role}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>

      <button disabled={!state.isDirty || !state.isValid}>
        Submit
      </button>
    </form>
  );
}
```

For component-owned forms, the React adapter can also create the form from options directly:

```tsx
const { form, useRegister, handleSubmit } = useForm({
  defaultValues: {
    email: '',
    remember: false,
  },
});
```

Options passed to `useForm(options)` are used only to create the form instance for that component lifetime. They are not reactive. When hydrating values from async data such as a query result, initialize with safe defaults and call `form.reset(nextValues)` explicitly when you want that data to become the new default baseline.

The React adapter also accepts reactive external `values`. When the `values` reference changes, the adapter calls `form.reset(values, resetOptions)` for you. This is useful for server/query data; use `keepDirtyValues` when refetches should not overwrite fields the user already edited.

```tsx
const { useRegister } = useForm({
  defaultValues: emptyUser,
  values: query.data,
  resetOptions: {
    keepDirtyValues: true,
    keepErrors: true,
  },
});
```

The React adapter has three first-version hooks. `useRegister` is overloaded for single, array, and rest-argument registration:

| Hook | Purpose |
| --- | --- |
| `useRegister(options)` | Returns input binding props for one field: `name`, `type`, `value`, `checked`, `onChange`, `onBlur`, `onFocus`. Default input `type` is `text`. |
| `useRegister<TElement>(options[])` | Returns multiple binding props in input order for map-friendly rendering. Use `HTMLSelectElement` or `HTMLTextAreaElement` as the generic when spreading into select/textarea. |
| `useRegister(optionA, optionB)` | Rest-argument form for multiple bindings; internally handled like an options array. |
| `useField(options)` | Returns `{ props, value, setValue, errors, dirty, touched }` for one field. It intentionally does not expose `field.register`. |
| `useFormState()` | Returns whole-form aggregate state such as `errors`, `dirtyFields`, `touchedFields`, `isDirty`, `isValid`, and `submitCount`. |

Field-local schemas can be passed to `useRegister` or `useField`. For that field, the field-local schema takes precedence over the form-level schema.

```tsx
const email = useField({
  name: 'email',
  schema: emailSchema,
});
```

The event model is DOM-event centered. Custom components can use `useRegister` when they pass through DOM-compatible `value`, `checked`, `onChange`, `onBlur`, and `onFocus` props.


## Vue adapter

Vue bindings are exposed through the `./vue` subpath. They use the same `useForm(form)` shape as the React adapter, but return Vue-friendly `v-bind` props with `onInput`, `onChange`, `onBlur`, and `onFocus` handlers.

`useForm` also accepts a `VueFormOptions` object with a `values` field (a `ref`, `computed`, getter, or plain value) and an optional `resetOptions`. When `values` changes by reference, the adapter calls `form.reset(values, resetOptions)` — the same model as the React adapter. Pass reactive sources (`ref`/`computed`) directly so Vue can track them; plain values are evaluated once on creation and re-evaluated when the component re-renders and `useForm` is called again.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from '@ilokesto/form/vue';

const serverValues = ref({ email: 'initial@example.com' });
const { form, useRegister } = useForm({
  defaultValues: { email: '' },
  values: serverValues,
});
</script>
```

```vue
<script setup lang="ts">
import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/vue';

const form = new CreateForm({
  defaultValues: {
    email: '',
    remember: false,
    role: 'user',
  },
  validateOn: ['blur', 'submit'],
});

const {
  useRegister,
  useField,
  useFormState,
} = useForm(form);

const email = useField({ name: 'email', schema: emailSchema });
const remember = useRegister({ name: 'remember', type: 'checkbox' });
const [role] = useRegister<HTMLSelectElement>([{ name: 'role' }]);
const state = useFormState();
</script>

<template>
  <form>
    <input v-bind="email.props" />
    <p v-for="error in email.errors" :key="error.message">
      {{ error.message }}
    </p>

    <label>
      <input type="checkbox" v-bind="remember" />
      Remember me
    </label>

    <select v-bind="role">
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>

    <button :disabled="!state.isDirty || !state.isValid">
      Submit
    </button>
  </form>
</template>
```

The Vue adapter exposes the same three concepts:

| Composable | Purpose |
| --- | --- |
| `useRegister(options)` | Returns one input-oriented `v-bind` binding object. It includes `type` and defaults to `text`; text inputs update on `input`; checkbox/radio update on `change`. Use a generic for select/textarea binding types. |
| `useRegister(options[])` / `useRegister(optionA, optionB)` | Returns multiple binding objects for map-friendly rendering. |
| `useField(options)` | Returns `{ props, value, setValue, errors, dirty, touched }` with getter-backed reactive reads. |
| `useFormState()` | Returns form-wide aggregate getters such as `errors`, `dirtyFields`, `touchedFields`, `focusedField`, `isDirty`, `isValid`, and `submitCount`. |

Field-local schemas work the same way as React and are cleaned up with the current Vue effect scope.

## Solid adapter

Solid bindings are exposed through the `./solid` subpath. They keep the same `useForm(form)` shape as React and Vue, but use Solid owner cleanup and getter-backed props.

```tsx
import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/solid';

const form = new CreateForm({
  defaultValues: {
    email: '',
    remember: false,
    role: 'user',
  },
  validateOn: ['blur', 'submit'],
});

function LoginForm() {
  const { useRegister, useField, useFormState } = useForm(form);
  const email = useField({ name: 'email', schema: emailSchema });
  const remember = useRegister({ name: 'remember', type: 'checkbox' });
  const role = useRegister<HTMLSelectElement>({ name: 'role' });
  const state = useFormState();

  return (
    <form>
      <input {...email.props} />
      {email.errors.map(error => <p>{error.message}</p>)}

      <input type="checkbox" {...remember} />

      <select {...role}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>

      <button disabled={!state.isDirty || !state.isValid}>Submit</button>
    </form>
  );
}
```

The Solid adapter exposes `useRegister`, `useField`, and `useFormState` with the same semantics as Vue: text inputs update on `input`, checkbox/radio/multiple select update on `change`, and field-local schemas are disposed with the current Solid owner.

## Svelte adapter

Svelte bindings are exposed through the `./svelte` subpath. Svelte does not use hook-style rendering, so the adapter exposes a `register` action and a Svelte readable form-state store.

```svelte
<script lang="ts">
  import { CreateForm } from '@ilokesto/form';
  import { useForm } from '@ilokesto/form/svelte';

  const form = new CreateForm({
    defaultValues: {
      email: '',
      remember: false,
      role: 'user',
    },
    validateOn: ['blur', 'submit'],
  });

  const { register, useFormState } = useForm(form);
  const state = useFormState();
</script>

<form>
  <input use:register={{ name: 'email', schema: emailSchema }} />
  <input type="checkbox" use:register={{ name: 'remember', type: 'checkbox' }} />

  <select use:register={{ name: 'role' }}>
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>

  <button disabled={!$state.isDirty || !$state.isValid}>Submit</button>
</form>
```

The Svelte action owns DOM synchronization directly: it sets the DOM `name`, keeps `value`/`checked` in sync from form state, writes user changes back to the core form, and cleans up field-local schemas when the action is destroyed.

## Core concepts

### `FieldPathSegment`

A single path segment is either a string object key or a numeric array index.

```ts
type FieldPathSegment = string | number;
```

Examples:

```ts
'user'
'name'
0
1
```

### `FieldPath`

A `FieldPath` is the internal tuple representation of a form field path.

```ts
type FieldPath = readonly FieldPathSegment[];
```

Examples:

```ts
['email']
['user', 'name']
['items', 0, 'title']
[] // root value
```

The root path is useful for primitive root values or root-level schema errors.

### `FieldPathInput`

Public APIs accept either a string field name or a tuple path.

```ts
type FieldPathInput = string | FieldPath;
```

A string is not parsed as a dot path. This prevents collisions between a nested path and an actual object key containing `.`.

### `PathKey`

`FormState.fields` and `FormState.arrayKeys` need string keys. `FormPath` converts tuple paths to stable string keys.

| FieldPath | PathKey |
| --- | --- |
| `[]` | `$` |
| `['email']` | `["email"]` |
| `['user', 'name']` | `["user","name"]` |
| `['items', 0, 'title']` | `["items",0,"title"]` |

The implementation uses JSON array strings instead of separator-based strings, so literal field names such as `"user.name"` are safe.

### `FieldState`

A `FieldState` stores the value and metadata for one leaf field.

```ts
type FieldState<TValue = unknown> = {
  value: TValue;
  errors: FormError[];
  touched: boolean;
  dirty: boolean;
  modified: boolean;
  isFocused: boolean;
};
```

The flags mean:

- `touched`: the field was blurred at least once.
- `dirty`: the current value is not `Object.is`-equal to the initial value at the same path.
- `modified`: the field was changed by a user-sourced write, `source: 'user'`.
- `isFocused`: the field currently has focus. Set to `true` by `focus()` and cleared by `blur()` (always, regardless of `validateOn`).
- `errors`: validation or manually assigned field errors.

### `FormState`

The internal snapshot is normalized.

```ts
type FormState<TValues> = {
  defaultValues: TValues;
  fields: Record<PathKey, FieldState>;
  submitCount: number;
  arrayKeys: Record<PathKey, string[]>;
};
```

For this input:

```ts
const form = new CreateForm({
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
});
```

The core stores leaf field states and array container keys separately:

```ts
{
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
  fields: {
    '["user","name"]': { value: 'Ada', errors: [], touched: false, dirty: false, modified: false, isFocused: false },
    '["items",0,"title"]': { value: 'A', errors: [], touched: false, dirty: false, modified: false, isFocused: false },
    '["items",1,"title"]': { value: 'B', errors: [], touched: false, dirty: false, modified: false, isFocused: false },
  },
  submitCount: 0,
  arrayKeys: {
    '["items"]': ['initial-0', 'initial-1'],
  },
}
```

`getValues()` reconstructs the nested object from `fields` and `arrayKeys`.

### `FormError`

```ts
type FormError = {
  type?: string;
  message: string;
};
```

Schema errors use `type: 'standard_schema'`. You can also set errors manually with `setErrors()`.

### `ValidationTrigger`

```ts
type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';
```

`validateOn` controls automatic validation. If omitted, the default is `['submit']`. Manual validation is always available through `trigger()`.

### `StandardSchemaV1`

The core accepts a Standard Schema compatible object:

```ts
const schema = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(value) {
      return { value };
    },
  },
};
```

On failure, `validate()` returns `issues`. Each issue path is converted into a `FieldPath`, then into a `PathKey`, then written to the corresponding `FieldState.errors`.

### Field-local schemas

Framework adapters can register a schema for a single field.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});
```

When a field-local schema exists, that field uses it instead of the form-level schema:

```txt
field-local schema > form-level schema
```

The cleanup function removes the schema registration if it is still the latest registration for that field.

### `ArrayKeys`

Array item identity is stored separately from array values.

- Items from `defaultValues` get deterministic keys: `initial-0`, `initial-1`, ...
- Runtime insertions get generated keys: `item-1`, `item-2`, ...
- `move()` and `swap()` move keys with values.
- `replace()` creates a new key for every new item and does not preserve old child metadata.

These keys are intended for framework list rendering.

## API guide

### `new CreateForm(options)`

```ts
const form = new CreateForm({
  defaultValues,
  schema,
  schemaOptions,
  validateOn,
});
```

Options:

- `defaultValues`: required default value tree. This is also the reset/dirty baseline.
- `schema`: optional Standard Schema v1 compatible schema.
- `schemaOptions`: optional Standard Schema validation options.
- `validateOn`: optional automatic validation triggers. Defaults to `['submit']`.

### `getState()`

Returns the current `FormState` snapshot.

```ts
const state = form.getState();
console.log(state.submitCount);
```

Treat the returned object as read-only.

### `subscribe(listener)`

Subscribes to store changes and returns an unsubscribe function.

```ts
const unsubscribe = form.subscribe(() => {
  console.log(form.getValues());
});

unsubscribe();
```

Framework adapters use this method to connect the core store to reactive rendering.

### `registerFieldSchema(path, options)`

Registers a field-local schema and returns a cleanup function.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});

cleanup();
```

This is mostly intended for framework adapters. A field-local schema overrides the form-level schema for that field during `blur()`, `trigger()`, and `submit()`.

### `getFieldState(path)`

Returns the `FieldState` for a path. If the field does not exist yet, the method returns a default field state instead of `undefined`.

```ts
const email = form.getFieldState('email');
```

### `getValue(path)`

Returns only the current field value.

```ts
const email = form.getValue('email');
```

### `getValues()`

Reconstructs and returns the full nested values object.

```ts
const values = form.getValues();
```

### `setValue(path, value, options?)`

Writes one field value.

```ts
form.setValue(['user', 'name'], 'Grace', {
  source: 'user',
  validate: true,
});
```

Effects:

1. Converts the public path input to an internal tuple path.
2. Writes the new value to the corresponding `FieldState`.
3. Recomputes `dirty` by comparing with `defaultValues` at the same path.
4. Sets `modified` to `true` only when `source === 'user'`.
5. Starts change validation if `options.validate` is true or `validateOn` contains `'change'`.

`setValue()` returns `void`; change validation is started asynchronously and is not awaited by the method.

Async validation uses a generation counter to prevent race conditions. If a new validation starts before a previous async validation resolves, the stale result is discarded and does not overwrite the store. This means rapid typing with async (server-side) schemas will always reflect the most recent values, not whichever Promise happens to resolve last.

### `blur(path)`

Marks the field as touched and optionally validates it.

```ts
const valid = await form.blur('email');
```

If `validateOn` does not contain `'blur'`, it returns `true` after touching the field.

### `focus(path)`

Sets `isFocused: true` on the field at `path`. Other fields are not touched — DOM naturally fires a `blur` event on the previously focused element, which clears `isFocused` via `blur()`. Array rebasing preserves `isFocused` across `move`/`swap`/`insert`/`remove`.

The core is DOM-independent, so calling `focus()` on multiple fields can leave more than one field with `isFocused: true`. In DOM adapters this is naturally bounded to one by the browser; in direct core usage it is the caller's responsibility to `blur()` the previous field. The `useFormState().focusedField` aggregate returns the **first** focused field found in `Object.entries` order, not the most recently focused one — to enumerate all focused fields, iterate `state.fields` directly.

### `setErrors(path, errors)`

Replaces the error list for one field.

```ts
form.setErrors('email', [{ message: 'Email is required' }]);
```

### `clearErrors(...paths)`

Clears errors for specific fields, or all existing fields when no path is passed.

```ts
form.clearErrors('email');
form.clearErrors();
```

### `trigger(...paths)`

Runs manual validation.

```ts
await form.trigger('email');
await form.trigger();
```

With paths, only those fields' errors are updated from the full schema result. Without paths, all registered fields and all schema error keys are updated.

### `array(path)`

Returns a `FormArray` controller for an array field.

```ts
const items = form.array('items');

items.push({ title: 'C' });
items.move(2, 0);
console.log(items.keys());
```

The array controller reads the latest values and keys from the store each time a command runs.

### `reset(values?, options?)`

Resets the form to initial state.

```ts
form.reset();
form.reset({ email: 'new@example.com' });
form.reset({ email: 'new@example.com' }, { keepDirtyValues: true });
```

Without an argument, it reuses the current `defaultValues`. With an argument, the argument becomes the new `defaultValues`.

Reset options can preserve selected state for fields that still exist in the new normalized value shape:

| Option | Behavior |
| --- | --- |
| `keepDirtyValues` | Keeps current values for dirty fields and recomputes dirty against the new `defaultValues`. |
| `keepErrors` | Keeps existing errors for surviving field paths. |
| `keepTouched` | Keeps touched flags for surviving field paths. |
| `keepSubmitState` | Keeps `submitCount`, `isSubmitting`, `isSubmitted`, and `isSubmitSuccessful`. |

### `submit(onValid, onInvalid?)`

Increments `submitCount`, validates the form, and calls the matching callback.

```ts
const result = await form.submit(
  values => values,
  fields => {
    console.log(fields);
  },
);
```

If validation fails, `onInvalid` receives the current `fields` object and `submit()` returns `undefined`. If validation succeeds, `onValid` receives reconstructed values.

### `FormArray.keys()`

Returns stable keys for rendering the current array items.

```ts
const keys = form.array('items').keys();
```

### `FormArray.insert(index, value)`

Inserts an item. Out-of-range indexes are bounded to `0...length`.

### `FormArray.push(value)`

Appends an item.

### `FormArray.remove(index)`

Removes an item. Invalid indexes are ignored.

### `FormArray.move(fromIndex, toIndex)`

Moves one item. Invalid indexes or a no-op move are ignored.

### `FormArray.swap(leftIndex, rightIndex)`

Swaps two items. Invalid indexes or identical indexes are ignored.

### `FormArray.replace(values)`

Replaces the whole array. Existing item links are intentionally broken, so child field metadata is not preserved.

## Runtime flows

### Form creation flow

```txt
new CreateForm(options)
  -> new FormStateStore(options.defaultValues)
    -> FormStateInitializer.initialize(defaultValues)
      -> fields for leaf values
      -> arrayKeys for array containers
  -> new ValidationEngine(store, options)
  -> new FormFieldCommands(store, validation)
  -> new FormArrayFactory(store)
  -> new FormSubmitter(store, validation)
```

The important point is that all collaborators share the same `FormStateStore`.

### Value write flow

```txt
form.setValue(path, value, options)
  -> FormFieldCommands.setValue()
  -> FormPath.toFieldPath(path)
  -> FormStateStore.setValue()
  -> FormStateWriter.setValue()
  -> compute dirty from defaultValues
  -> optionally mark modified
  -> optionally start change validation
```

`dirty` and `modified` are intentionally separate. Programmatic writes can make a field dirty without marking it as user-modified.

### Blur flow

```txt
form.blur(path)
  -> FormFieldCommands.blur()
  -> FormPath.pathInputToKey(path)
  -> FormStateStore.touchField(key)
  -> if validateOn includes 'blur': ValidationEngine.validateField(key, 'blur')
  -> otherwise return true
```

### Manual validation flow

```txt
form.trigger(...paths)
  -> no paths: validateRegisteredFields('manual')
  -> with paths: validateFields(keys, 'manual')
  -> field-local schema exists: validate that field value and replace that field's errors
  -> otherwise: StandardSchemaValidator.validate(values)
  -> issue paths become PathKeys
  -> selected field errors are replaced
```

Without a field-local schema, field-level validation still runs the whole form schema, then applies only the target field errors. This keeps the schema adapter simple and schema-library independent. With a field-local schema, that schema overrides form-level errors for the same field.

### Submit flow

```txt
form.submit(onValid, onInvalid)
  -> increment submitCount
  -> validateRegisteredFields('submit')
  -> invalid: onInvalid(fields), return undefined
  -> valid: onValid(getValues())
```

`submitCount` records submit attempts, not successful submissions.

### Array mutation flow

```txt
form.array('items').move(1, 0)
  -> FormArrayController.move()
  -> read current array values and keys
  -> FormArrayMutationPlanner.move()
    -> next values
    -> next keys
    -> previous-index to next-index mapper
  -> FormArrayRebaser.rebase()
    -> write next array into values
    -> initialize a fresh FormState from next values
    -> preserve non-array fields
    -> move child metadata through the index mapper
    -> write next array keys
```

This is the core feature that keeps `items[1].name` metadata attached to the same logical item when that item moves to `items[0].name`.

## Internal architecture

```txt
src/index.ts
  -> src/core/index.ts
    -> form/CreateForm.ts
       -> state/FormStateStore.ts
          -> state/FormStateInitializer.ts
          -> state/FormStateReader.ts
          -> state/FormStateWriter.ts
       -> form/FormFieldCommands.ts
          -> validation/ValidationEngine.ts
             -> validation/StandardSchemaValidator.ts
       -> form/FormSubmitter.ts
       -> array/FormArrayFactory.ts
          -> array/FormArrayController.ts
             -> array/FormArrayMutationPlanner.ts
             -> array/FormArrayRebaser.ts
                -> array/FormArrayPath.ts
                -> array/ArrayItemReorder.ts
             -> array/ArrayKeyGenerator.ts
    -> path/FormPath.ts
    -> value/ValueHelper.ts
    -> types.ts
  -> src/adapters/
     -> dom/FieldValue.ts
     -> dom/RegisterBinding.ts
     -> FormStateSummary.ts
  -> src/react/index.ts
     -> React hook adapter over shared adapter logic
  -> src/vue/index.ts
     -> Vue composable adapter over shared adapter logic
  -> src/solid/index.ts
     -> Solid helper adapter over shared adapter logic
  -> src/svelte/index.ts
     -> Svelte action adapter over shared adapter logic
```

Responsibility summary:

| Area | Responsibility |
| --- | --- |
| `form/` | Public orchestration: field commands, submit flow, array controller access. |
| `state/` | Normalized state initialization, reading, writing, and store facade. |
| `path/` | Conversion between public path input, tuple paths, and string path keys. |
| `value/` | Immutable nested get/set and reconstruction of values from field states. |
| `validation/` | Standard Schema execution and error normalization. |
| `array/` | Array item key management, mutation planning, and child field metadata rebasing. |
| `adapters/` | Internal shared adapter logic: DOM value extraction/binding and form-state aggregation. |
| `react/` | React hook adapter around the public `Form` interface. |
| `vue/` | Vue composable adapter around the public `Form` interface. |
| `solid/` | Solid helper adapter around the public `Form` interface. |
| `svelte/` | Svelte action adapter around the public `Form` interface. |
| `types.ts` | Public and internal TypeScript contracts. |

## Core walkthrough

### `src/index.ts`

The package root exports only the stable framework-agnostic surface:

```ts
export { CreateForm } from './core/index';
export type {
  CreateFormOptions,
  FieldPathInput,
  Form,
  FormError,
  StandardSchemaV1,
} from './core/index';
```

Internal state and command helper types stay out of the package root. They are documented here to explain the implementation, but consumers should interact through `Form`, `CreateForm`, field paths, errors, and Standard Schema contracts.

### `src/core/index.ts`

This file re-exports `CreateForm` and public types from `types.ts`. It is the boundary between the package root and the implementation folders.

### `src/core/types.ts`

`types.ts` defines the core vocabulary:

- public path type: `FieldPathInput`; internal path concepts: `FieldPathSegment`, `FieldPath`, `PathKey`
- exported validation types: `FormError`, `StandardSchemaV1`; internal validation trigger type: `ValidationTrigger`
- internal state types: `FieldState`, `ArrayKeys`, `FormState`
- public API types: `CreateFormOptions`, `Form`; internal command helper types: `FormArray`, `SetValueOptions`

The most important design in this file is that public string paths are literal field names. Nested fields require tuple paths.

### `src/core/form/CreateForm.ts`

`CreateForm` is the top-level controller and the main public class.

It owns four collaborators:

```txt
store     -> state storage and state operations
fields    -> setValue, blur, errors, trigger
arrays    -> array(path) controller creation
submitter -> submitCount, validation, callbacks
```

The constructor creates one `FormStateStore`, then passes it to all collaborators. That makes every command operate on the same snapshot.

Most methods are thin delegations:

- `getState()`, `getFieldState()`, `getValue()`, `getValues()`, `reset()` delegate to `FormStateStore`.
- `setValue()`, `blur()`, `focus()`, `setErrors()`, `clearErrors()`, `trigger()` delegate to `FormFieldCommands`.
- `array()` converts the path to a tuple and asks `FormArrayFactory` for a controller.
- `submit()` delegates to `FormSubmitter`.

This keeps the public API stable while implementation responsibilities stay separated.

### `src/core/form/FormFieldCommands.ts`

`FormFieldCommands` groups field-level operations.

`setValue()`:

1. Converts the path to a tuple through `FormPath.toFieldPath()`.
2. Writes the value through `store.setValue()`.
3. Receives the resulting `PathKey`.
4. Starts change validation if `options.validate` is true or `validateOn` contains `'change'`.

`blur()`:

1. Converts the public path to a `PathKey`.
2. Marks the field as touched.
3. Runs blur validation only when configured.

`focus()` sets `isFocused: true` on the field. The matching `blur()` command clears `isFocused` (always, regardless of `validateOn`) and marks the field as `touched`. The `isFocused` flag is preserved across array rebasing.

`setErrors()`, `clearErrors()`, and `trigger()` normalize paths to keys and delegate to the store or validation engine.

### `src/core/form/FormSubmitter.ts`

`FormSubmitter` isolates submit-specific sequencing:

```txt
increment submitCount
validate all registered fields
if invalid -> call onInvalid(fields) and return undefined
if valid -> call onValid(getValues())
```

The class exists because submit is a multi-step command and should not make `CreateForm` responsible for validation branching.

### `src/core/state/FieldStateFactory.ts`

`FieldStateFactory` centralizes the default field state shape:

```ts
{
  value: undefined,
  errors: [],
  touched: false,
  dirty: false,
  modified: false,
}
```

It creates a new `errors` array each time to avoid shared mutable references. The same factory is used for initial leaf fields and missing-field fallbacks.

### `src/core/state/FormStateInitializer.ts`

`FormStateInitializer.initialize(defaultValues)` converts nested values into normalized `FormState`.

Rules:

1. Arrays are containers, not leaf fields.
2. Array containers receive `arrayKeys` such as `initial-0`, `initial-1`.
3. Array items are visited recursively.
4. Plain objects are traversed.
5. Empty plain objects are stored as leaf values because there is no deeper field.
6. Non-plain objects such as `Date` and class instances are treated as leaf values.
7. Primitives and `null` are leaf values.

This is why `getState().fields` contains leaf paths rather than the original nested object.

### `src/core/state/FormStateReader.ts`

`FormStateReader` handles read-only derived operations.

- `getKnownFieldPaths()` converts every stored `PathKey` back to a tuple path.
- `getFieldStateByKey()` returns an existing field or a default `FieldState`.
- `getFieldState()` and `getValue()` are path-input convenience methods.
- `getValues()` reconstructs the full nested value tree with `ValueHelper.getValuesFromFields()`.
- `getValueAtPath()` reconstructs values first, then reads a nested path from them.

The reader receives a snapshot getter rather than owning the store directly, so it always reads the latest state.

### `src/core/state/FormStateWriter.ts`

`FormStateWriter` performs all state mutations through `immer`.

`setValue()`:

- Converts the tuple path to a `PathKey`.
- Reads the initial value at that tuple path.
- Preserves existing field metadata when possible.
- Replaces `value`.
- Computes `dirty` with `Object.is`.
- Sets `modified` only for `source: 'user'`.
- Returns the `PathKey` so validation can reuse it.

Other methods:

- `touchField()` sets `touched: true`.
- `setErrorsByKey()` replaces the error array.
- `clearErrors()` clears target fields or all existing fields.
- `reset()` reinitializes state from the current or replacement initial values.
- `incrementSubmitCount()` increments attempts.
- `replaceState()` is an escape hatch for whole-state operations such as array rebasing.

### `src/core/state/FormStateStore.ts`

`FormStateStore` is the facade used by the rest of the core.

It owns:

- `Store<FormState<TValues>>` from `@ilokesto/store`
- `FormStateReader`
- `FormStateWriter`

Collaborators do not need to know whether an operation is implemented by the reader, writer, or underlying store. They call the facade.

### `src/core/path/FormPath.ts`

`FormPath` defines path conversion rules.

Key methods:

- `path(...segments)`: helper for tuple paths.
- `toFieldPath(input)`: string becomes `[input]`; tuple path passes through.
- `pathInputToKey(input)`: public path input to `PathKey`.
- `pathToKey(path)`: `[]` becomes `$`, otherwise JSON stringifies the tuple.
- `keyToPath(key)`: parses and validates a key back into tuple segments.

The JSON encoding is what prevents path collisions.

### `src/core/value/ValueHelper.ts`

`ValueHelper` provides immutable nested value operations.

`getValueAtPath(source, path)` walks an object/array safely. If an intermediate value is nullish or primitive, it returns `undefined`.

`setValueAtPath(source, path, value)` returns a new root value and shallow-clones containers along the path. Missing containers are inferred from the next segment: a number creates an array, a string creates an object.

`getValuesFromFields(state, fieldPaths)` reconstructs public values in two phases:

1. Create empty array containers from `arrayKeys`.
2. Write every leaf field value into its tuple path.

This lets normalized `fields` become a nested object again.

### `src/core/validation/ValidationEngine.ts`

`ValidationEngine` coordinates validation triggers and store writes.

- Default `validateOn` is `['submit']`.
- If no schema is provided, validation succeeds with no errors.
- `validateField(key, trigger)` runs the full schema and applies only that field's errors.
- `validateFields(keys, trigger)` runs the full schema and applies only selected fields' errors.
- `validateRegisteredFields(trigger)` runs the full schema and updates all current fields plus all schema error keys.

The engine deliberately ignores the trigger value when calling the schema. The trigger controls when the engine runs, not the schema API.

All three validation entry points (`validateField`, `validateFields`, `validateRegisteredFields`) use an internal generation counter to guard against async race conditions. Each call increments the counter before awaiting, and discards results if a newer validation has started in the meantime.

### `src/core/validation/StandardSchemaValidator.ts`

`StandardSchemaValidator` adapts Standard Schema results to core errors.

Success:

```ts
{ valid: true, errorsByKey: {} }
```

Failure:

```ts
{
  valid: false,
  errorsByKey: {
    '["email"]': [{ type: 'standard_schema', message: 'Email is invalid' }],
  },
}
```

Issue path conversion rules:

- Missing or empty path becomes the root path `[]` and key `$`.
- String and number path segments are preserved.
- Object path segments use their `.key` property.
- Unsupported keys such as symbols fall back to root errors.

### `src/core/array/ArrayKeyGenerator.ts`

`ArrayKeyGenerator` creates runtime item keys:

```txt
item-1
item-2
item-3
```

A single `FormArrayFactory` shares one generator per form instance, reducing accidental key collisions across controllers.

### `src/core/array/ArrayItemReorder.ts`

`ArrayItemReorder` is a pure helper for array order operations.

- `moveItem(items, from, to)` returns a reordered copy.
- `swapItems(items, left, right)` returns a swapped copy.
- `createIndexMapper(previousLength, nextOrder)` returns a function that maps a previous index to its next index.

`nextOrder` is expressed as "for each next position, which previous index is here?" New items use `-1`, and removed items simply do not appear.

### `src/core/array/FormArrayMutationPlanner.ts`

`FormArrayMutationPlanner` calculates array mutations without knowing about the store.

Each mutation returns:

```ts
type FormArrayMutation = {
  values: readonly unknown[];
  keys: readonly string[];
  mapPreviousIndex: (index: number) => number | undefined;
};
```

Command behavior:

- `insert()` bounds the target index and inserts a new value/key. The new item maps from `-1`, so no previous metadata is attached to it.
- `push()` appends a value/key.
- `remove()` drops a value/key and maps removed indexes to `undefined`.
- `move()` moves values and keys with the same rule.
- `swap()` swaps values and keys with the same rule.
- `replace()` returns all new values/keys and maps every previous index to `undefined`.

Because this planner is pure, it is easy to test independently from the store.

### `src/core/array/FormArrayPath.ts`

`FormArrayPath` contains path helpers used during rebasing.

- `hasPathPrefix(fieldPath, prefix)` checks tuple prefix equality.
- `isArrayChildPath(fieldPath, arrayPath)` checks whether a field is below an array item, such as `['items', 0, 'name']` below `['items']`.
- `replaceArrayIndex(fieldPath, arrayPath, nextIndex)` creates a new child path with the item index replaced.

### `src/core/array/FormArrayController.ts`

`FormArrayController` is the public command object returned by `form.array(path)`.

It holds:

- the shared `FormStateStore`
- the shared `ArrayKeyGenerator`
- the controlled array `FieldPath`
- a `FormArrayMutationPlanner`

Each command follows the same pattern:

```txt
read current array value
read current keys
ask planner for next values, keys, and index mapper
if mutation exists, rebase the whole FormState
```

`getArray()` reads the current value at the array path. If the value is not an array, it uses an empty array.

`getKeys()` reads stored `arrayKeys`; if none exist, it creates keys for the current array length.

### `src/core/array/FormArrayFactory.ts`

`FormArrayFactory` creates `FormArrayController` instances and shares one `ArrayKeyGenerator` for the form instance.

This allows repeated calls such as `form.array('items')` to create fresh controllers without resetting the key sequence.

### `src/core/array/FormArrayRebaser.ts`

`FormArrayRebaser` is the most important array component. It aligns values, field states, array keys, and submit count after an array mutation.

Detailed sequence:

1. Read known field paths from the current store.
2. Reconstruct current values with `store.getValues()`.
3. Write the next array into those values with `ValueHelper.setValueAtPath()`.
4. Initialize a fresh `FormState` from the next values.
5. Start with the freshly initialized fields.
6. Iterate over previous fields.
7. Preserve fields outside the changed array.
8. For child fields inside the changed array, map the previous item index to the next item index.
9. If the item still exists, replace the index in the child path and copy metadata to the new field.
10. Write the next `arrayKeys` for the array path.
11. Preserve `submitCount`.

Only metadata is copied for rebased child fields:

```txt
errors
touched
dirty
modified
```

The value itself comes from the freshly initialized state based on the new values. This prevents stale values while preserving user interaction metadata.

## Design decisions

### Strings are literal paths

Dot-path parsing is convenient but ambiguous. This core chooses unambiguous tuple paths instead.

```ts
'user.name'        // one field named "user.name"
['user', 'name']   // nested user.name field
```

### State is normalized

Normalized fields make it easy to update individual metadata without mutating the whole nested value object. `ValueHelper` reconstructs the public value shape when needed.

### Validation is schema-library independent

The core only knows Standard Schema. This keeps validation compatible with multiple libraries and avoids importing a specific validator.

### Array mutation is split into planning and rebasing

`FormArrayMutationPlanner` decides what the next array looks like. `FormArrayRebaser` decides how the whole form state should follow. This separation keeps mutation math pure and store updates centralized.

### `dirty` and `modified` are different

`dirty` compares current value with the initial value. `modified` tracks user-originated writes. A programmatic update can be dirty without being modified by the user.

## Testing and development

### Commands

```sh
pnpm build
pnpm typecheck
pnpm test
```

`pnpm build` emits declaration files with TypeScript, rewrites only declaration-file relative specifiers for NodeNext compatibility, and bundles ESM JavaScript with Vite so source imports can stay extensionless while `dist/index.js` and adapter subpaths such as `dist/react/index.js`, `dist/vue/index.js`, `dist/solid/index.js`, and `dist/svelte/index.js` remain directly importable by ESM runtimes.

`pnpm test` runs the Vitest suite.

### Current test coverage themes

The existing tests cover:

1. Tuple paths versus literal string names.
2. Standard Schema validation on blur, manual trigger, and submit.
3. Array value/key/metadata rebasing when moving and removing items.
4. React adapter bindings for text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, and field-local schema precedence.
5. Vue adapter bindings for text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, and field-local schema cleanup.
6. Solid adapter bindings for text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, and field-local schema cleanup.
7. Svelte register action bindings for text input, checkbox, radio, select, multiple select, readable `useFormState`, and field-local schema cleanup.

### Suggested future documentation/tests

Good additions would be:

- A test for `insert()` index bounding.
- A test for `replace()` intentionally dropping child metadata.
- A test for root-level schema errors.
- More adapter examples for custom DOM-event-compatible components.
