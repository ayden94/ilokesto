# @ilokesto/form

[English](./README.md) | 한국어

`@ilokesto/form`은 프레임워크에 의존하지 않는 form state core다. 렌더링과 이벤트 바인딩은 framework adapter에 맡기고, core는 form values, field metadata, validation errors, submit attempts, array item keys를 하나의 정규화된 store 안에서 관리한다.

이 패키지는 다섯 가지 아이디어를 중심으로 설계되어 있다.

1. **프레임워크 독립성**: core는 plain TypeScript class인 `CreateForm`을 노출하고 React, Vue, Svelte, Solid, DOM API를 import하지 않는다.
2. **dot path가 아닌 tuple path**: `"user.name"` 같은 문자열은 literal field name이고, nested path는 `["user", "name"]` 같은 tuple로 표현한다.
3. **정규화된 field state**: nested values는 leaf `FieldState` record로 분리되어 저장되고, `getValues()`를 호출할 때 다시 복원된다.
4. **Standard Schema validation**: core는 특정 schema library가 아니라 Standard Schema v1의 `~standard.validate` 계약에만 의존한다.
5. **Array rebasing**: array item이 move, swap, insert, remove될 때 `errors`, `touched`, `dirty`, `modified` 같은 child field metadata가 item과 함께 이동한다.

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

이 패키지는 `@ilokesto/form` 이름으로 npm에 public access로 게시된다. workspace에서는 package manager 또는 workspace protocol을 통해 추가하면 된다. package가 publish되거나 link된 상태에서 import surface는 다음과 같다.

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

이 package는 ESM JavaScript와 TypeScript declaration을 `dist/`로 emit한다.

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

중요한 path rule:

```ts
form.setValue(['profile', 'name'], 'Grace');
form.setValue('profile.name', 'literal field');
```

이 둘은 서로 다른 field다. `['profile', 'name']`은 nested `profile.name` value를 의미한다. `'profile.name'`은 실제 key에 dot이 들어간 top-level field를 의미한다.

## React adapter

React binding은 `./react` subpath로 노출된다. 그래서 package root는 framework-agnostic core만 유지한다.

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

Component가 form을 소유하는 경우 React adapter는 options로 form을 직접 만들 수도 있다.

```tsx
const { form, useRegister, handleSubmit } = useForm({
  defaultValues: {
    email: '',
    remember: false,
  },
});
```

`useForm(options)`에 전달한 options는 해당 component lifetime 동안 form instance를 만들 때 사용된다. React adapter에서는 외부 `values`도 받을 수 있다. `values` reference가 바뀌면 adapter가 `form.reset(values, resetOptions)`를 대신 호출한다. `useQuery` 같은 async data로 값을 hydrate할 때 사용자 편집값을 덮어쓰고 싶지 않다면 `keepDirtyValues`를 사용한다.

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

React adapter의 첫 버전 hook은 세 가지다. `useRegister`는 단일, 배열, rest-argument 등록을 모두 처리하도록 overload되어 있다.

| Hook | Purpose |
| --- | --- |
| `useRegister(options)` | 단일 field의 input binding props를 반환한다: `name`, `type`, `value`, `checked`, `onChange`, `onBlur`, `onFocus`. 기본 input `type`은 `text`다. |
| `useRegister<TElement>(options[])` | map-friendly rendering을 위해 여러 binding props를 입력 순서대로 반환한다. select/textarea에 spread할 때는 `HTMLSelectElement` 또는 `HTMLTextAreaElement` generic으로 좁힌다. |
| `useRegister(optionA, optionB)` | 여러 binding을 rest arguments로 받는다. 내부적으로 options array처럼 처리한다. |
| `useField(options)` | 한 field에 대해 `{ props, value, setValue, errors, dirty, touched }`를 반환한다. `field.register`는 의도적으로 노출하지 않는다. |
| `useFormState()` | `errors`, `dirtyFields`, `touchedFields`, `isDirty`, `isValid`, `submitCount` 같은 form 전체 aggregate state를 반환한다. |

Field-local schema는 `useRegister` 또는 `useField`에 전달할 수 있다. 해당 field에 대해서는 field-local schema가 form-level schema보다 우선한다.

```tsx
const email = useField({
  name: 'email',
  schema: emailSchema,
});
```

Event model은 DOM event 중심이다. Custom component도 DOM-compatible `value`, `checked`, `onChange`, `onBlur`, `onFocus` props를 그대로 전달한다면 `useRegister`를 사용할 수 있다.


## Vue adapter

Vue binding은 `./vue` subpath로 노출된다. React adapter와 같은 `useForm(form)` 형태를 쓰지만, Vue template의 `v-bind`에 바로 전달할 수 있도록 `onInput`, `onChange`, `onBlur`, `onFocus` handler를 가진 props를 반환한다.

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

Vue adapter도 같은 세 가지 개념을 노출한다.

| Composable | Purpose |
| --- | --- |
| `useRegister(options)` | 하나의 input 중심 `v-bind` binding object를 반환한다. `type`이 포함되고 기본값은 `text`다. Text input은 `input` event에서, checkbox/radio는 `change` event에서 값을 갱신한다. select/textarea 타입은 generic으로 좁힌다. |
| `useRegister(options[])` / `useRegister(optionA, optionB)` | map-friendly rendering을 위해 여러 binding object를 반환한다. |
| `useField(options)` | getter 기반 reactive read를 가진 `{ props, value, setValue, errors, dirty, touched }`를 반환한다. |
| `useFormState()` | `errors`, `dirtyFields`, `touchedFields`, `isDirty`, `isValid`, `submitCount` 같은 form 전체 aggregate getter를 반환한다. |

Field-local schema는 React와 같은 방식으로 동작하고 현재 Vue effect scope가 정리될 때 함께 cleanup된다.

## Solid adapter

Solid binding은 `./solid` subpath로 노출된다. React/Vue와 같은 `useForm(form)` 형태를 유지하되, Solid owner cleanup과 getter 기반 props를 사용한다.

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

Solid adapter는 Vue와 같은 의미의 `useRegister`, `useField`, `useFormState`를 제공한다. Text input은 `input` event에서, checkbox/radio/multiple select는 `change` event에서 갱신하고, field-local schema는 현재 Solid owner와 함께 dispose된다.

## Svelte adapter

Svelte binding은 `./svelte` subpath로 노출된다. Svelte는 hook-style rendering을 쓰지 않으므로 adapter는 `register` action과 Svelte readable form-state store를 제공한다.

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

Svelte action은 DOM synchronization을 직접 담당한다. DOM `name`을 설정하고, form state에서 `value`/`checked`를 sync하고, user change를 core form에 쓰며, action이 destroy될 때 field-local schema를 cleanup한다.

## Core concepts

### `FieldPathSegment`

하나의 path segment는 string object key 또는 numeric array index다.

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

`FieldPath`는 form field path의 내부 tuple 표현이다.

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

Root path는 primitive root value나 root-level schema error에 유용하다.

### `FieldPathInput`

Public API는 string field name 또는 tuple path를 받는다.

```ts
type FieldPathInput = string | FieldPath;
```

String은 dot path로 파싱되지 않는다. 그래서 nested path와 `.` 문자를 실제로 포함한 object key가 충돌하지 않는다.

### `PathKey`

`FormState.fields`와 `FormState.arrayKeys`는 string key가 필요하다. `FormPath`는 tuple path를 안정적인 string key로 변환한다.

| FieldPath | PathKey |
| --- | --- |
| `[]` | `$` |
| `['email']` | `["email"]` |
| `['user', 'name']` | `["user","name"]` |
| `['items', 0, 'title']` | `["items",0,"title"]` |

구현은 separator 기반 문자열 대신 JSON array string을 사용한다. 그래서 `"user.name"` 같은 literal field name도 안전하다.

### `FieldState`

`FieldState`는 하나의 leaf field가 가진 value와 metadata를 저장한다.

```ts
type FieldState<TValue = unknown> = {
  value: TValue;
  errors: FormError[];
  touched: boolean;
  dirty: boolean;
  modified: boolean;
};
```

Flag의 의미:

- `touched`: field가 한 번 이상 blur되었다.
- `dirty`: 현재 value가 같은 path의 initial value와 `Object.is` 기준으로 다르다.
- `modified`: `source: 'user'` write로 field가 변경되었다.
- `errors`: validation 또는 manual assignment로 붙은 field errors.

### `FormState`

Internal snapshot은 정규화되어 있다.

```ts
type FormState<TValues> = {
  defaultValues: TValues;
  fields: Record<PathKey, FieldState>;
  submitCount: number;
  arrayKeys: Record<PathKey, string[]>;
};
```

다음 input이 있을 때:

```ts
const form = new CreateForm({
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
});
```

Core는 leaf field states와 array container keys를 따로 저장한다.

```ts
{
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
  fields: {
    '["user","name"]': { value: 'Ada', errors: [], touched: false, dirty: false, modified: false },
    '["items",0,"title"]': { value: 'A', errors: [], touched: false, dirty: false, modified: false },
    '["items",1,"title"]': { value: 'B', errors: [], touched: false, dirty: false, modified: false },
  },
  submitCount: 0,
  arrayKeys: {
    '["items"]': ['initial-0', 'initial-1'],
  },
}
```

`getValues()`는 `fields`와 `arrayKeys`에서 nested object를 복원한다.

### `FormError`

```ts
type FormError = {
  type?: string;
  message: string;
};
```

Schema error는 `type: 'standard_schema'`를 사용한다. `setErrors()`로 error를 직접 설정할 수도 있다.

### `ValidationTrigger`

```ts
type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';
```

`validateOn`은 automatic validation을 제어한다. 생략하면 기본값은 `['submit']`이다. Manual validation은 `trigger()`로 언제든 실행할 수 있다.

### `StandardSchemaV1`

Core는 Standard Schema compatible object를 받는다.

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

실패 시 `validate()`는 `issues`를 반환한다. 각 issue path는 `FieldPath`로 변환되고, 다시 `PathKey`로 변환된 뒤 해당 `FieldState.errors`에 기록된다.

### Field-local schemas

Framework adapter는 single field에 대한 schema를 등록할 수 있다.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});
```

Field-local schema가 있으면 해당 field는 form-level schema 대신 그 schema를 사용한다.

```txt
field-local schema > form-level schema
```

Cleanup function은 자신이 등록한 schema가 여전히 해당 field의 최신 registration일 때만 제거한다.

### `ArrayKeys`

Array item identity는 array values와 별도로 저장된다.

- `defaultValues`에서 온 item은 deterministic key를 받는다: `initial-0`, `initial-1`, ...
- Runtime insertion은 generated key를 받는다: `item-1`, `item-2`, ...
- `move()`와 `swap()`은 value와 함께 key를 이동시킨다.
- `replace()`는 모든 새 item에 새 key를 만들고 old child metadata를 보존하지 않는다.

이 key들은 framework list rendering을 위한 것이다.

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

- `defaultValues`: required default value tree. reset/dirty 기준값으로도 사용된다.
- `schema`: optional Standard Schema v1 compatible schema.
- `schemaOptions`: optional Standard Schema validation options.
- `validateOn`: optional automatic validation triggers. Defaults to `['submit']`.

### `getState()`

현재 `FormState` snapshot을 반환한다.

```ts
const state = form.getState();
console.log(state.submitCount);
```

반환된 object는 read-only로 취급해야 한다.

### `subscribe(listener)`

Store change를 구독하고 unsubscribe function을 반환한다.

```ts
const unsubscribe = form.subscribe(() => {
  console.log(form.getValues());
});

unsubscribe();
```

Framework adapter는 이 method를 사용해 core store와 reactive rendering을 연결한다.

### `registerFieldSchema(path, options)`

Field-local schema를 등록하고 cleanup function을 반환한다.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});

cleanup();
```

이 API는 주로 framework adapter를 위한 것이다. Field-local schema는 `blur()`, `trigger()`, `submit()` 동안 해당 field에서 form-level schema보다 우선한다.

### `getFieldState(path)`

Path에 해당하는 `FieldState`를 반환한다. Field가 아직 존재하지 않아도 `undefined` 대신 default field state를 반환한다.

```ts
const email = form.getFieldState('email');
```

### `getValue(path)`

현재 field value만 반환한다.

```ts
const email = form.getValue('email');
```

### `getValues()`

전체 nested values object를 복원해 반환한다.

```ts
const values = form.getValues();
```

### `setValue(path, value, options?)`

하나의 field value를 쓴다.

```ts
form.setValue(['user', 'name'], 'Grace', {
  source: 'user',
  validate: true,
});
```

Effects:

1. Public path input을 internal tuple path로 변환한다.
2. 새 value를 해당 `FieldState`에 쓴다.
3. 같은 path의 `defaultValues`와 비교해 `dirty`를 다시 계산한다.
4. `source === 'user'`일 때만 `modified`를 `true`로 만든다.
5. `options.validate`가 true이거나 `validateOn`에 `'change'`가 있으면 change validation을 시작한다.

`setValue()`는 `void`를 반환한다. Change validation은 async로 시작되며 method가 await하지 않는다.

### `blur(path)`

Field를 touched 처리하고 필요하면 validate한다.

```ts
const valid = await form.blur('email');
```

`validateOn`에 `'blur'`가 없으면 field를 touch한 뒤 `true`를 반환한다.

### `focus(path)`

현재는 no-op이다. Minimal core state가 focused field를 저장하지 않더라도 framework adapter가 stable command surface를 제공할 수 있도록 존재한다.

### `setErrors(path, errors)`

하나의 field error list를 교체한다.

```ts
form.setErrors('email', [{ message: 'Email is required' }]);
```

### `clearErrors(...paths)`

특정 field들의 errors를 비우거나, path를 넘기지 않으면 existing field 전체 errors를 비운다.

```ts
form.clearErrors('email');
form.clearErrors();
```

### `trigger(...paths)`

Manual validation을 실행한다.

```ts
await form.trigger('email');
await form.trigger();
```

Path가 있으면 full schema result에서 해당 field errors만 update한다. Path가 없으면 registered fields와 schema error keys 전체를 update한다.

### `array(path)`

Array field를 위한 `FormArray` controller를 반환한다.

```ts
const items = form.array('items');

items.push({ title: 'C' });
items.move(2, 0);
console.log(items.keys());
```

Array controller는 command가 실행될 때마다 store에서 최신 values와 keys를 읽는다.

### `reset(values?, options?)`

Form을 initial state로 되돌린다.

```ts
form.reset();
form.reset({ email: 'new@example.com' });
form.reset({ email: 'new@example.com' }, { keepDirtyValues: true });
```

Argument가 없으면 현재 `defaultValues`를 재사용한다. Argument가 있으면 그 값이 새로운 `defaultValues`가 된다.

Reset options는 새 normalized value shape에도 살아남은 field path에 대해 일부 상태를 보존한다.

| Option | Behavior |
| --- | --- |
| `keepDirtyValues` | dirty field의 현재 value를 유지하고 새 `defaultValues` 기준으로 dirty를 다시 계산한다. |
| `keepErrors` | 살아남은 field path의 errors를 유지한다. |
| `keepTouched` | 살아남은 field path의 touched flag를 유지한다. |
| `keepSubmitState` | `submitCount`, `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`을 유지한다. |

### `submit(onValid, onInvalid?)`

`submitCount`를 증가시키고 form을 validate한 뒤 알맞은 callback을 호출한다.

```ts
const result = await form.submit(
  values => values,
  fields => {
    console.log(fields);
  },
);
```

Validation이 실패하면 `onInvalid`는 현재 `fields` object를 받고 `submit()`은 `undefined`를 반환한다. Validation이 성공하면 `onValid`는 복원된 values를 받는다.

### `FormArray.keys()`

현재 array items를 rendering하기 위한 stable keys를 반환한다.

```ts
const keys = form.array('items').keys();
```

### `FormArray.insert(index, value)`

Item을 삽입한다. Out-of-range index는 `0...length` 범위로 보정된다.

### `FormArray.push(value)`

Item을 끝에 추가한다.

### `FormArray.remove(index)`

Item을 제거한다. Invalid index는 무시된다.

### `FormArray.move(fromIndex, toIndex)`

Item 하나를 이동한다. Invalid index 또는 no-op move는 무시된다.

### `FormArray.swap(leftIndex, rightIndex)`

두 item을 교환한다. Invalid index 또는 같은 index는 무시된다.

### `FormArray.replace(values)`

Array 전체를 교체한다. 기존 item link를 의도적으로 끊기 때문에 child field metadata는 보존되지 않는다.

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

핵심은 모든 collaborator가 같은 `FormStateStore`를 공유한다는 점이다.

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

`dirty`와 `modified`는 의도적으로 분리되어 있다. Programmatic write는 field를 dirty하게 만들 수 있지만 user-modified로 표시하지 않을 수 있다.

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
  -> StandardSchemaValidator.validate(values)
  -> issue paths become PathKeys
  -> selected field errors are replaced
```

Field-level validation도 full schema를 실행한 뒤 target field errors만 적용한다. 이렇게 하면 schema adapter가 단순하고 schema-library independent하게 유지된다.

### Submit flow

```txt
form.submit(onValid, onInvalid)
  -> increment submitCount
  -> validateRegisteredFields('submit')
  -> invalid: onInvalid(fields), return undefined
  -> valid: onValid(getValues())
```

`submitCount`는 successful submissions가 아니라 submit attempts를 기록한다.

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

이 흐름이 `items[1].name` metadata를 동일한 logical item에 붙인 채 그 item이 `items[0].name`으로 이동하게 만드는 핵심 기능이다.

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
     -> shared adapter logic 위의 React hook adapter
  -> src/vue/index.ts
     -> shared adapter logic 위의 Vue composable adapter
  -> src/solid/index.ts
     -> shared adapter logic 위의 Solid helper adapter
  -> src/svelte/index.ts
     -> shared adapter logic 위의 Svelte action adapter
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
| `adapters/` | 내부 shared adapter logic: DOM value extraction/binding, form-state aggregation. |
| `react/` | Public `Form` interface를 감싸는 React hook adapter. |
| `vue/` | Public `Form` interface를 감싸는 Vue composable adapter. |
| `solid/` | Public `Form` interface를 감싸는 Solid helper adapter. |
| `svelte/` | Public `Form` interface를 감싸는 Svelte action adapter. |
| `types.ts` | Public and internal TypeScript contracts. |

## Core walkthrough

### `src/index.ts`

Package root는 안정적인 framework-agnostic surface만 export한다.

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

Internal state와 command helper 타입은 package root에서 내보내지 않는다. 이 문서에서는 구현 설명을 위해 다루지만, consumer는 `Form`, `CreateForm`, field path, errors, Standard Schema contract를 통해 사용해야 한다.

### `src/core/index.ts`

이 파일은 `types.ts`의 public types와 `CreateForm`을 re-export한다. Package root와 implementation folders 사이의 boundary다.

### `src/core/types.ts`

`types.ts`는 core vocabulary를 정의한다.

- public path type: `FieldPathInput`; internal path concepts: `FieldPathSegment`, `FieldPath`, `PathKey`
- exported validation types: `FormError`, `StandardSchemaV1`; internal validation trigger type: `ValidationTrigger`
- internal state types: `FieldState`, `ArrayKeys`, `FormState`
- public API types: `CreateFormOptions`, `Form`; internal command helper types: `FormArray`, `SetValueOptions`

이 파일에서 가장 중요한 설계는 public string path가 literal field name이라는 점이다. Nested field에는 tuple path가 필요하다.

### `src/core/form/CreateForm.ts`

`CreateForm`은 top-level controller이자 main public class다.

네 collaborator를 소유한다.

```txt
store     -> state storage and state operations
fields    -> setValue, blur, errors, trigger
arrays    -> array(path) controller creation
submitter -> submitCount, validation, callbacks
```

Constructor는 하나의 `FormStateStore`를 만들고 모든 collaborator에 전달한다. 그래서 모든 command는 같은 snapshot 위에서 동작한다.

대부분의 method는 얇은 delegation이다.

- `getState()`, `getFieldState()`, `getValue()`, `getValues()`, `reset()`은 `FormStateStore`에 위임한다.
- `setValue()`, `blur()`, `focus()`, `setErrors()`, `clearErrors()`, `trigger()`는 `FormFieldCommands`에 위임한다.
- `array()`는 path를 tuple로 변환하고 `FormArrayFactory`에 controller를 요청한다.
- `submit()`은 `FormSubmitter`에 위임한다.

이 구조는 public API를 stable하게 유지하면서 implementation responsibilities를 분리한다.

### `src/core/form/FormFieldCommands.ts`

`FormFieldCommands`는 field-level operations를 묶는다.

`setValue()`:

1. `FormPath.toFieldPath()`로 path를 tuple로 변환한다.
2. `store.setValue()`로 value를 쓴다.
3. 결과 `PathKey`를 받는다.
4. `options.validate`가 true이거나 `validateOn`에 `'change'`가 있으면 change validation을 시작한다.

`blur()`:

1. Public path를 `PathKey`로 변환한다.
2. Field를 touched 처리한다.
3. 설정된 경우에만 blur validation을 실행한다.

`focus()`는 현재 no-op이다. Minimal core state가 focus를 추적하지 않기 때문이다. Adapter-level consistency를 위해 method는 유지한다.

`setErrors()`, `clearErrors()`, `trigger()`는 path를 key로 normalize하고 store 또는 validation engine에 위임한다.

### `src/core/form/FormSubmitter.ts`

`FormSubmitter`는 submit-specific sequencing을 분리한다.

```txt
increment submitCount
validate all registered fields
if invalid -> call onInvalid(fields) and return undefined
if valid -> call onValid(getValues())
```

Submit은 multi-step command이므로 `CreateForm`이 validation branching까지 책임지지 않게 별도 class로 분리되어 있다.

### `src/core/state/FieldStateFactory.ts`

`FieldStateFactory`는 default field state shape을 중앙화한다.

```ts
{
  value: undefined,
  errors: [],
  touched: false,
  dirty: false,
  modified: false,
}
```

Shared mutable reference를 피하기 위해 매번 새 `errors` array를 만든다. 같은 factory는 initial leaf fields와 missing-field fallback에 모두 사용된다.

### `src/core/state/FormStateInitializer.ts`

`FormStateInitializer.initialize(defaultValues)`는 nested values를 normalized `FormState`로 변환한다.

Rules:

1. Arrays는 leaf field가 아니라 containers다.
2. Array containers는 `initial-0`, `initial-1` 같은 `arrayKeys`를 받는다.
3. Array items는 recursive하게 방문된다.
4. Plain objects는 traverse된다.
5. Empty plain object는 더 내려갈 field가 없으므로 leaf value로 저장된다.
6. `Date`, class instance 같은 non-plain objects는 leaf value로 취급된다.
7. Primitive와 `null`은 leaf value다.

그래서 `getState().fields`는 원래 nested object가 아니라 leaf paths를 가진다.

### `src/core/state/FormStateReader.ts`

`FormStateReader`는 read-only derived operations를 담당한다.

- `getKnownFieldPaths()`는 저장된 모든 `PathKey`를 tuple path로 되돌린다.
- `getFieldStateByKey()`는 existing field 또는 default `FieldState`를 반환한다.
- `getFieldState()`와 `getValue()`는 path-input convenience methods다.
- `getValues()`는 `ValueHelper.getValuesFromFields()`로 full nested value tree를 복원한다.
- `getValueAtPath()`는 먼저 values를 복원한 뒤 nested path를 읽는다.

Reader는 store를 직접 소유하지 않고 snapshot getter를 받기 때문에 항상 최신 state를 읽는다.

### `src/core/state/FormStateWriter.ts`

`FormStateWriter`는 모든 state mutation을 `immer`로 수행한다.

`setValue()`:

- Tuple path를 `PathKey`로 변환한다.
- 해당 tuple path의 initial value를 읽는다.
- 가능하면 existing field metadata를 보존한다.
- `value`를 교체한다.
- `Object.is`로 `dirty`를 계산한다.
- `source: 'user'`일 때만 `modified`를 설정한다.
- Validation이 재사용할 수 있도록 `PathKey`를 반환한다.

Other methods:

- `touchField()`는 `touched: true`를 설정한다.
- `setErrorsByKey()`는 error array를 교체한다.
- `clearErrors()`는 target fields 또는 existing fields 전체 errors를 비운다.
- `reset()`은 현재 또는 replacement initial values로 state를 다시 초기화한다.
- `incrementSubmitCount()`는 attempts를 증가시킨다.
- `replaceState()`는 array rebasing 같은 whole-state operation을 위한 escape hatch다.

### `src/core/state/FormStateStore.ts`

`FormStateStore`는 core의 다른 부분들이 사용하는 facade다.

소유하는 것:

- `@ilokesto/store`의 `Store<FormState<TValues>>`
- `FormStateReader`
- `FormStateWriter`

Collaborator들은 operation이 reader, writer, underlying store 중 어디에서 구현되는지 알 필요가 없다. Facade만 호출하면 된다.

### `src/core/path/FormPath.ts`

`FormPath`는 path conversion rules를 정의한다.

Key methods:

- `path(...segments)`: tuple path helper.
- `toFieldPath(input)`: string은 `[input]`이 되고 tuple path는 그대로 통과한다.
- `pathInputToKey(input)`: public path input을 `PathKey`로 변환한다.
- `pathToKey(path)`: `[]`는 `$`, 나머지는 tuple을 JSON stringify한다.
- `keyToPath(key)`: key를 tuple segments로 parse하고 validate한다.

JSON encoding이 path collision을 방지한다.

### `src/core/value/ValueHelper.ts`

`ValueHelper`는 immutable nested value operations를 제공한다.

`getValueAtPath(source, path)`는 object/array를 안전하게 walk한다. 중간 value가 nullish이거나 primitive이면 `undefined`를 반환한다.

`setValueAtPath(source, path, value)`는 new root value를 반환하고 path를 따라 container를 shallow-clone한다. Missing container는 next segment로 추론한다. Number면 array를 만들고 string이면 object를 만든다.

`getValuesFromFields(state, fieldPaths)`는 public values를 두 단계로 복원한다.

1. `arrayKeys`에서 empty array containers를 만든다.
2. 모든 leaf field value를 tuple path 위치에 쓴다.

이 과정을 통해 normalized `fields`가 다시 nested object가 된다.

### `src/core/validation/ValidationEngine.ts`

`ValidationEngine`은 validation triggers와 store writes를 조율한다.

- Default `validateOn`은 `['submit']`이다.
- Schema가 없으면 validation은 error 없이 성공한다.
- `validateField(key, trigger)`는 full schema를 실행하고 해당 field errors만 적용한다.
- `validateFields(keys, trigger)`는 full schema를 실행하고 selected fields errors만 적용한다.
- `validateRegisteredFields(trigger)`는 full schema를 실행하고 current fields와 schema error keys 전체를 update한다.

Engine은 schema를 호출할 때 trigger value를 전달하지 않는다. Trigger는 engine이 언제 실행될지를 제어하지 schema API를 바꾸지 않는다.

### `src/core/validation/StandardSchemaValidator.ts`

`StandardSchemaValidator`는 Standard Schema result를 core errors로 adapt한다.

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

- Missing path 또는 empty path는 root path `[]`와 key `$`가 된다.
- String과 number path segment는 그대로 보존된다.
- Object path segment는 `.key` property를 사용한다.
- Symbol 같은 unsupported key는 root error로 fallback된다.

### `src/core/array/ArrayKeyGenerator.ts`

`ArrayKeyGenerator`는 runtime item keys를 만든다.

```txt
item-1
item-2
item-3
```

하나의 `FormArrayFactory`는 form instance마다 하나의 generator를 공유한다. 이렇게 하면 여러 controller 사이에서 accidental key collision 가능성을 줄인다.

### `src/core/array/ArrayItemReorder.ts`

`ArrayItemReorder`는 array order operations를 위한 pure helper다.

- `moveItem(items, from, to)`는 reordered copy를 반환한다.
- `swapItems(items, left, right)`는 swapped copy를 반환한다.
- `createIndexMapper(previousLength, nextOrder)`는 previous index를 next index로 mapping하는 function을 반환한다.

`nextOrder`는 "각 next position에는 어떤 previous index가 있는가?"로 표현된다. New item은 `-1`을 사용하고 removed item은 아예 등장하지 않는다.

### `src/core/array/FormArrayMutationPlanner.ts`

`FormArrayMutationPlanner`는 store를 몰라도 array mutations를 계산한다.

각 mutation은 다음 형태를 반환한다.

```ts
type FormArrayMutation = {
  values: readonly unknown[];
  keys: readonly string[];
  mapPreviousIndex: (index: number) => number | undefined;
};
```

Command behavior:

- `insert()`는 target index를 보정하고 새 value/key를 삽입한다. New item은 `-1`에서 온 것으로 처리되어 previous metadata가 붙지 않는다.
- `push()`는 value/key를 끝에 추가한다.
- `remove()`는 value/key를 제거하고 removed index는 `undefined`로 map한다.
- `move()`는 같은 rule로 values와 keys를 이동한다.
- `swap()`은 같은 rule로 values와 keys를 교환한다.
- `replace()`는 모두 새 values/keys를 반환하고 모든 previous index를 `undefined`로 map한다.

이 planner는 pure하기 때문에 store와 독립적으로 test하기 쉽다.

### `src/core/array/FormArrayPath.ts`

`FormArrayPath`는 rebasing 중 필요한 path helpers를 담는다.

- `hasPathPrefix(fieldPath, prefix)`는 tuple prefix equality를 확인한다.
- `isArrayChildPath(fieldPath, arrayPath)`는 `['items']` 아래의 `['items', 0, 'name']`처럼 field가 array item 아래에 있는지 확인한다.
- `replaceArrayIndex(fieldPath, arrayPath, nextIndex)`는 item index가 교체된 새 child path를 만든다.

### `src/core/array/FormArrayController.ts`

`FormArrayController`는 `form.array(path)`가 반환하는 public command object다.

보유하는 것:

- shared `FormStateStore`
- shared `ArrayKeyGenerator`
- controlled array `FieldPath`
- `FormArrayMutationPlanner`

각 command는 같은 pattern을 따른다.

```txt
read current array value
read current keys
ask planner for next values, keys, and index mapper
if mutation exists, rebase the whole FormState
```

`getArray()`는 array path의 현재 value를 읽는다. Value가 array가 아니면 empty array를 사용한다.

`getKeys()`는 stored `arrayKeys`를 읽는다. 없으면 current array length만큼 key를 만든다.

### `src/core/array/FormArrayFactory.ts`

`FormArrayFactory`는 `FormArrayController` instances를 만들고 form instance를 위한 하나의 `ArrayKeyGenerator`를 공유한다.

이 덕분에 `form.array('items')`를 반복 호출해서 fresh controller를 만들어도 key sequence가 reset되지 않는다.

### `src/core/array/FormArrayRebaser.ts`

`FormArrayRebaser`는 가장 중요한 array component다. Array mutation 뒤 values, field states, array keys, submit count를 정렬한다.

Detailed sequence:

1. Current store에서 known field paths를 읽는다.
2. `store.getValues()`로 current values를 복원한다.
3. `ValueHelper.setValueAtPath()`로 next array를 values에 쓴다.
4. Next values에서 fresh `FormState`를 initialize한다.
5. Freshly initialized fields에서 시작한다.
6. Previous fields를 순회한다.
7. Changed array 밖의 fields는 보존한다.
8. Changed array 안의 child fields는 previous item index를 next item index로 mapping한다.
9. Item이 아직 존재하면 child path의 index를 교체하고 metadata를 new field로 copy한다.
10. Array path에 next `arrayKeys`를 쓴다.
11. `submitCount`를 보존한다.

Rebased child field에 copy되는 것은 metadata뿐이다.

```txt
errors
touched
dirty
modified
```

Value 자체는 next values로부터 freshly initialized state에서 온다. 그래서 stale value를 방지하면서 user interaction metadata는 보존한다.

## Design decisions

### Strings are literal paths

Dot-path parsing은 편하지만 모호하다. 이 core는 unambiguous tuple paths를 선택한다.

```ts
'user.name'        // one field named "user.name"
['user', 'name']   // nested user.name field
```

### State is normalized

Normalized fields는 whole nested value object를 mutate하지 않고도 개별 metadata를 update하기 쉽게 만든다. `ValueHelper`는 필요할 때 public value shape을 복원한다.

### Validation is schema-library independent

Core는 Standard Schema만 안다. 그래서 여러 validation library와 호환되고 특정 validator를 import하지 않는다.

### Array mutation is split into planning and rebasing

`FormArrayMutationPlanner`는 next array가 어떤 모습인지 결정한다. `FormArrayRebaser`는 전체 form state가 어떻게 따라가야 하는지 결정한다. 이 분리는 mutation math를 pure하게 만들고 store updates를 중앙화한다.

### `dirty` and `modified` are different

`dirty`는 current value와 initial value를 비교한다. `modified`는 user-originated writes를 추적한다. Programmatic update는 dirty일 수 있지만 user modified는 아닐 수 있다.

## Testing and development

### Commands

```sh
pnpm build
pnpm typecheck
pnpm test
```

`pnpm build`는 TypeScript로 declaration files를 emit하고, NodeNext 호환성을 위해 declaration-file relative specifier만 보정한 뒤, Vite로 ESM JavaScript를 bundle한다. 그래서 source import는 extensionless로 유지하면서도 `dist/index.js`, `dist/react/index.js`, `dist/vue/index.js`, `dist/solid/index.js`, `dist/svelte/index.js` 같은 adapter subpath는 ESM runtime에서 직접 import할 수 있다.

`pnpm test`는 Vitest suite를 실행한다.

### Current test coverage themes

Existing tests는 다음을 cover한다.

1. Tuple paths와 literal string names의 차이.
2. Blur, manual trigger, submit에서의 Standard Schema validation.
3. Move와 remove 시 array value/key/metadata rebasing.
4. React adapter의 text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, field-local schema precedence.
5. Vue adapter의 text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, field-local schema cleanup.
6. Solid adapter의 text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, field-local schema cleanup.
7. Svelte register action의 text input, checkbox, radio, select, multiple select, readable `useFormState`, field-local schema cleanup.

### Suggested future documentation/tests

좋은 추가 항목:

- `insert()` index bounding test.
- `replace()`가 child metadata를 의도적으로 drop하는지에 대한 test.
- Root-level schema errors test.
- Custom DOM-event-compatible component를 위한 adapter examples.
