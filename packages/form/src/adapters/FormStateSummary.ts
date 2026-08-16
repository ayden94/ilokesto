import type { FormError, FormState } from '../core/index';

export type FormStateSummary<TValues> = {
  state: Readonly<FormState<TValues>>;
  errors: Record<string, FormError[]>;
  dirtyFields: Record<string, true>;
  touchedFields: Record<string, true>;
  /**
   * 현재 focus 된 field의 PathKey 중 하나를 반환하거나 focus 된 field가 없으면 null을 반환한다.
   *
   * @remarks
   * core는 DOM과 독립적으로 동작하므로 focus() 호출로 여러 field가 동시에 isFocused: true가 될 수 있다.
   * 이 값은 entries 순서상 첫 번째로 발견된 focused field이지 "마지막으로 focus 된 field"가 아니다.
   * DOM 어댑터에서는 브라우저가 이전 element의 blur를 자연스럽게 발생시켜 항상 1개 이하가 유지되지만,
   * core를 직접 사용할 때는 여러 field가 focus 될 수 있으므로 이 값만으로 전체 focus 상태를 파악하면 안 된다.
   * 모든 focused field를 알려면 state.fields를 직접 순회하라.
   */
  focusedField: string | null;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  submitCount: number;
};

/** Framework adapter들이 공유하는 form-wide aggregate state를 만든다. */
export function createFormStateSummary<TValues>(state: Readonly<FormState<TValues>>): FormStateSummary<TValues> {
  const errors = collectErrors(state);
  const dirtyFields = collectFlaggedFields(state, 'dirty');
  const touchedFields = collectFlaggedFields(state, 'touched');
  const focusedField = findFocusedField(state);

  return {
    state,
    errors,
    dirtyFields,
    touchedFields,
    focusedField,
    isDirty: Object.keys(dirtyFields).length > 0,
    isValid: Object.keys(errors).length === 0,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    isSubmitSuccessful: state.isSubmitSuccessful,
    submitCount: state.submitCount,
  };
}

function collectErrors<TValues>(state: Readonly<FormState<TValues>>): Record<string, FormError[]> {
  return Object.fromEntries(
    Object.entries(state.fields)
      .filter(([, field]) => field.errors.length > 0)
      .map(([key, field]) => [key, [...field.errors]]),
  );
}

function collectFlaggedFields<TValues>(state: Readonly<FormState<TValues>>, flag: 'dirty' | 'touched'): Record<string, true> {
  return Object.fromEntries(
    Object.entries(state.fields)
      .filter(([, field]) => field[flag])
      .map(([key]) => [key, true]),
  );
}

function findFocusedField<TValues>(state: Readonly<FormState<TValues>>): string | null {
  const entry = Object.entries(state.fields).find(([, field]) => field.isFocused);
  return entry ? entry[0] : null;
}
