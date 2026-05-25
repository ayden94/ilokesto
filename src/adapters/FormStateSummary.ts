import type { FormError, FormState } from '../core/index';

export type FormStateSummary<TValues> = {
  state: Readonly<FormState<TValues>>;
  errors: Record<string, FormError[]>;
  dirtyFields: Record<string, true>;
  touchedFields: Record<string, true>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

/** Framework adapter들이 공유하는 form-wide aggregate state를 만든다. */
export function createFormStateSummary<TValues>(state: Readonly<FormState<TValues>>): FormStateSummary<TValues> {
  const errors = collectErrors(state);
  const dirtyFields = collectFlaggedFields(state, 'dirty');
  const touchedFields = collectFlaggedFields(state, 'touched');

  return {
    state,
    errors,
    dirtyFields,
    touchedFields,
    isDirty: Object.keys(dirtyFields).length > 0,
    isValid: Object.keys(errors).length === 0,
    isSubmitting: false,
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
