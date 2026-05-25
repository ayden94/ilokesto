# @ilokesto/form

`@ilokesto/form`은 framework에 묶이지 않는 form core입니다.

이 패키지의 목표는 DOM, React, Vue 같은 UI 계층과 분리된 상태에서 form 값을 저장하고, field 상태를 추적하고, 외부 검증기를 실행하고, 배열 field의 index 변경까지 일관되게 처리하는 것입니다.

현재 runtime public API는 `CreateForm` 하나입니다.

```ts
import { CreateForm } from '@ilokesto/form';

const form = new CreateForm({
  initialValues: {
    email: '',
    items: [{ name: '' }],
  },
  validateOn: ['blur', 'submit'],
  schema,
});
```

## 공개 API

패키지 root와 `core/index.ts`는 외부 사용자가 form을 만들고 타입을 잡는 데 필요한 계약만 내보냅니다.

```ts
export { CreateForm } from './core/index';
```

공개 타입은 `CreateFormOptions`, `Form`, `FormState`, `FieldState`, `FormArray`, `FormError`, `StandardSchemaV1` 등 사용자 코드가 직접 참조할 수 있는 계약 중심입니다.

`FormStateStore`, `ValidationEngine`, `FormArrayRebaser`, `ValueHelper`, `FormPath` 같은 구현 클래스는 public surface에서 숨깁니다. 외부 기여자는 내부 구조를 이해할 수는 있지만, 사용자에게 노출되는 API를 넓힐 때는 명확한 이유가 있어야 합니다.

## 폴더 구조

```text
src/core/
  form/
    CreateForm.ts
    FormFieldCommands.ts
    FormSubmitter.ts
    index.ts

  state/
    FormStateStore.ts
    FormStateReader.ts
    FormStateWriter.ts
    FormStateInitializer.ts
    FieldStateFactory.ts
    index.ts

  validation/
    ValidationEngine.ts
    StandardSchemaValidator.ts
    index.ts

  array/
    FormArrayFactory.ts
    FormArrayController.ts
    FormArrayMutationPlanner.ts
    FormArrayRebaser.ts
    FormArrayPath.ts
    ArrayItemReorder.ts
    ArrayKeyGenerator.ts
    index.ts

  path/
    FormPath.ts
    index.ts

  value/
    ValueHelper.ts
    index.ts

  types.ts
  index.ts
```

각 기능 폴더의 `index.ts`는 그 폴더의 대표 클래스만 내보냅니다.

```text
form/index.ts        -> CreateForm
state/index.ts       -> FormStateStore
validation/index.ts  -> ValidationEngine
array/index.ts       -> FormArrayFactory
path/index.ts        -> FormPath
value/index.ts       -> ValueHelper
```

대표 클래스 뒤에 있는 helper들은 같은 기능 폴더 내부 구현입니다. 예를 들어 `array/` 밖에서는 `FormArrayFactory`만 알면 되고, `FormArrayMutationPlanner`나 `ArrayItemReorder`는 배열 기능을 완성하기 위한 내부 협력 객체입니다.

## 핵심 설계

가장 중요한 원칙은 모든 기능이 같은 `FormStateStore`를 공유한다는 점입니다.

```text
CreateForm
  -> FormStateStore
  -> ValidationEngine(FormStateStore)
  -> FormFieldCommands(FormStateStore, ValidationEngine)
  -> FormArrayFactory(FormStateStore)
  -> FormSubmitter(FormStateStore, ValidationEngine)
```

값 변경, blur, validation, submit, 배열 rebase가 모두 같은 store snapshot을 기준으로 동작합니다. 그래서 한 이벤트 안에서 값, `touched`, `dirty`, `errors`, `arrayKeys`가 서로 어긋나지 않습니다.

## 기능별 처리 흐름

### 1. form 생성

```text
new CreateForm({ initialValues, schema, validateOn })
-> FormStateStore 생성
-> FormStateInitializer.initialize(initialValues)
-> FieldStateFactory로 leaf field 상태 생성
-> arrayKeys 생성
-> ValidationEngine 생성
-> FormFieldCommands / FormArrayFactory / FormSubmitter 연결
```

`initialValues`는 그대로 중첩 객체로 저장되지 않습니다. core는 leaf field들을 `fields`에 저장하고, 배열 container 정보는 `arrayKeys`에 저장합니다.

```text
FormState
  initialValues
  fields
  submitCount
  arrayKeys
```

이 구조 덕분에 field별 `errors`, `touched`, `dirty`, `modified`를 독립적으로 추적할 수 있습니다.

### 2. 값 읽기

```text
CreateForm.getValue(path)
-> FormStateStore.getValue(path)
-> FormStateReader.getValue(path)
```

전체 values를 읽을 때는 leaf field와 array container를 다시 조립합니다.

```text
CreateForm.getValues()
-> FormStateStore.getValues()
-> FormStateReader.getValues()
-> ValueHelper.getValuesFromFields(state, fieldPaths)
```

`ValueHelper`는 `fields`와 `arrayKeys`를 사용해 사용자가 기대하는 nested values 형태를 복원합니다.

### 3. 값 변경

```text
CreateForm.setValue(path, value, options)
-> FormFieldCommands.setValue(path, value, options)
-> FormPath.toFieldPath(path)
-> FormStateStore.setValue(fieldPath, value, options)
-> FormStateWriter.setValue(...)
```

`FormStateWriter`는 값을 쓸 때 field metadata도 함께 갱신합니다.

```text
value     새 값으로 교체
dirty     initialValues의 같은 path 값과 다르면 true
modified  options.source가 'user'이면 true
```

그 다음 검증 조건을 확인합니다.

```text
options.validate === true
또는 validateOn에 'change' 포함
-> ValidationEngine.validateField(fieldKey, 'change')
```

`setValue`는 `void` API입니다. change validation이 비동기라면 호출자는 기다리지 않습니다. 검증이 끝나면 store의 errors가 갱신됩니다.

### 4. blur와 touched, validation

`onBlur`에 해당하는 core 명령은 `blur(path)`입니다.

```text
CreateForm.blur(path)
-> FormFieldCommands.blur(path)
-> FormPath.pathInputToKey(path)
-> FormStateStore.touchField(fieldKey)
-> FormStateWriter.touchField(fieldKey)
-> validateOn에 'blur'가 있으면 ValidationEngine.validateField(fieldKey, 'blur')
```

순서는 의도적으로 고정되어 있습니다.

1. field를 먼저 `touched = true`로 바꿉니다.
2. `validateOn`에 `blur`가 있는지 확인합니다.
3. 켜져 있다면 최신 form values를 기준으로 validation을 실행합니다.
4. 결과 errors를 같은 field state에 기록합니다.

그래서 UI adapter는 blur 이후 `getFieldState(path)`를 읽었을 때 `touched`와 `errors`를 같은 snapshot에서 볼 수 있습니다.

이 흐름이 조화롭게 동작하려면 `FormFieldCommands`, `FormStateStore`, `ValidationEngine`이 같은 store를 공유해야 합니다. 현재 구조는 생성자에서 그 연결을 보장합니다.

### 5. 수동 검증

```text
CreateForm.trigger(...paths)
-> FormFieldCommands.trigger(paths)
-> paths가 있으면 ValidationEngine.validateFields(keys, 'manual')
-> paths가 없으면 ValidationEngine.validateRegisteredFields('manual')
```

`trigger()`는 `validateOn` 설정과 무관하게 호출자가 직접 검증을 요청하는 API입니다.

### 6. submit

```text
CreateForm.submit(onValid, onInvalid)
-> FormSubmitter.submit(...)
-> FormStateStore.incrementSubmitCount()
-> ValidationEngine.validateRegisteredFields('submit')
-> valid이면 FormStateStore.getValues()
-> onValid(values)
-> invalid이면 onInvalid(fields)
```

submit은 상태 변경, 전체 검증, callback 분기를 포함하는 별도 workflow입니다. 그래서 `CreateForm`이 직접 처리하지 않고 `FormSubmitter`가 담당합니다.

## validation 구조

검증은 `validation/` 폴더가 담당합니다.

```text
ValidationEngine
  -> StandardSchemaValidator
  -> FormStateStore.setErrorsByKey
```

현재 검증 입력은 하나입니다.

```text
schema      Standard Schema compatible schema
```

Zod, Valibot처럼 Standard Schema를 구현한 library를 넘기면 core는 특정 library를 알 필요 없이 `~standard.validate`만 호출합니다.

```ts
const form = new CreateForm({
  initialValues,
  schema,
  validateOn: ['blur', 'submit'],
});
```

Standard Schema 검증 흐름은 다음과 같습니다.

```text
ValidationEngine
-> FormStateStore.getValues()
-> StandardSchemaValidator.validate(values)
-> schema['~standard'].validate(values, schemaOptions)
-> issues를 PathKey별 FormError[]로 변환
-> FormStateStore.setErrorsByKey(fieldKey, errors)
```

issue path가 있으면 해당 field에 error가 붙고, path가 없거나 core path로 표현할 수 없으면 root error로 처리됩니다.

검증 규칙은 schema 하나에만 둡니다. core는 `required`, `minLength`, custom field validator 같은 규칙을 직접 갖지 않습니다. 새로운 UI adapter를 만들 때도 adapter가 자체 검증 규칙을 실행하지 않고, schema validation을 호출하는 core 명령만 연결해야 합니다.

## array 구조

배열은 값만 바꾸면 안 됩니다. item index가 바뀌면 child field state도 함께 옮겨야 합니다.

예를 들어 `items[0].name`에 error가 있는데 item을 `move(0, 2)` 하면, 그 error는 새 위치인 `items[2].name`으로 이동해야 합니다.

배열 흐름은 다음과 같습니다.

```text
CreateForm.array(path)
-> FormArrayFactory.create(path)
-> FormArrayController
```

배열 명령은 `FormArrayController`가 받습니다.

```text
FormArrayController.push/remove/move/swap/replace
-> 현재 배열 값 읽기
-> 현재 arrayKeys 읽기
-> FormArrayMutationPlanner로 다음 배열 값과 key 계산
-> FormArrayRebaser로 FormState 전체 rebase
-> FormStateStore.replaceState
```

역할을 나누면 다음과 같습니다.

```text
FormArrayController         배열 public 명령의 흐름 담당
FormArrayMutationPlanner    다음 배열 값, 다음 key, index mapper 계산
ArrayItemReorder            move/swap 같은 순수 배열 재정렬
ArrayKeyGenerator           새 item key 생성
FormArrayRebaser            child field state를 새 index로 이동
FormArrayPath               배열 child path 판별과 index 교체
```

`replace()`는 기존 item과의 연결을 끊는 명령입니다. 따라서 기존 child field metadata를 재사용하지 않고 새 값 기준으로 초기화합니다.

## path와 value

모든 기능이 같은 path 규칙을 사용해야 상태가 어긋나지 않습니다.

`FormPath`는 public path input과 내부 key를 변환합니다.

```text
FieldPathInput
-> FieldPath
-> PathKey
```

string path는 dot path로 파싱하지 않습니다. `"user.name"`은 하나의 field 이름입니다. nested path를 표현하려면 tuple을 사용합니다.

```ts
form.setValue(['user', 'name'], 'Jin');
```

이 규칙을 지키면 실제 field 이름에 `.`이 있어도 path 충돌이 없습니다.

`ValueHelper`는 nested value를 읽고 쓰거나, `fields + arrayKeys`에서 전체 values를 복원합니다.

## 기여할 때 지켜야 할 기준

1. public API는 좁게 유지합니다.
   외부 사용자가 직접 호출해야 하는 것만 `src/index.ts`와 `core/index.ts`에서 내보냅니다.

2. 기능 폴더 밖에서는 대표 클래스만 import합니다.
   예를 들어 `form/`은 `array/index.ts`의 `FormArrayFactory`를 알고, `FormArrayMutationPlanner`를 직접 알지 않는 것이 좋습니다.

3. 상태 변경은 `state/`를 통합니다.
   field metadata를 직접 조작하지 말고 `FormStateStore` 또는 `FormStateWriter`로 흐르게 합니다.

4. 검증은 `validation/`으로 모읍니다.
   UI adapter나 field event handler가 직접 schema를 실행하지 않습니다.

5. 배열 index 변경은 반드시 rebase를 거칩니다.
   배열 값만 바꾸면 child field errors/touched/dirty/modified가 틀어집니다.

6. path 변환 규칙은 `FormPath`로 통일합니다.
   임의 string join/split로 path key를 만들지 않습니다.

7. 파일명은 클래스명과 맞춥니다.
   클래스 하나당 파일 하나를 기본으로 합니다.

## 검증 명령

변경 후에는 최소한 아래 명령을 실행합니다.

```bash
pnpm run typecheck
pnpm run build
```

현재 패키지는 framework adapter를 포함하지 않는 core-only 구조입니다.
