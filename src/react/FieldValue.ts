import type { FieldPathInput, FieldState, Form, FormState } from '../core/index';

/** 최신 snapshot을 읽은 뒤 field state를 가져온다. container field는 복원된 values에서 값을 보강한다. */
export function getFieldState<TValues>(form: Form<TValues>, state: Readonly<FormState<TValues>>, name: FieldPathInput): Readonly<FieldState> {
  const field = form.getFieldState(name);

  if (fieldPathExists(state, name)) {
    return field;
  }

  const value = getValueAtPath(form.getValues(), toFieldPath(name));

  return {
    ...field,
    value,
  };
}

/** public path input을 내부 tuple path와 같은 형태로 맞춘다. */
function toFieldPath(name: FieldPathInput): readonly (string | number)[] {
  return typeof name === 'string' ? [name] : name;
}

/** FormState.fields에 직접 존재하는 leaf field인지 확인한다. */
function fieldPathExists<TValues>(state: Readonly<FormState<TValues>>, name: FieldPathInput): boolean {
  return pathInputToKey(name) in state.fields;
}

/** core의 PathKey 규칙과 같은 key를 만든다. */
function pathInputToKey(name: FieldPathInput): string {
  const path = toFieldPath(name);

  return path.length === 0 ? '$' : JSON.stringify(path);
}

/** 복원된 values에서 tuple path가 가리키는 값을 읽는다. */
function getValueAtPath(source: unknown, path: readonly (string | number)[]): unknown {
  let current = source;

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object' && typeof current !== 'function') {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[segment];
  }

  return current;
}
