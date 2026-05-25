import { useMemo } from 'react';
import type { Form, FormError, FormState } from '../core/index';
import type { UseFormStateReturn } from './types';
import { useFormSnapshot } from './useFormSnapshot';

/** form 전체 aggregate state를 반환한다. */
export function useFormStateWithForm<TValues>(form: Form<TValues>): UseFormStateReturn<TValues> {
  const state = useFormSnapshot(form);

  return useMemo(() => createFormStateReturn(state), [state]);
}

/** 전체 form snapshot에서 aggregate state를 만든다. */
function createFormStateReturn<TValues>(state: Readonly<FormState<TValues>>): UseFormStateReturn<TValues> {
  const errors: Record<string, FormError[]> = {};
  const dirtyFields: Record<string, true> = {};
  const touchedFields: Record<string, true> = {};

  Object.entries(state.fields).forEach(([fieldKey, field]) => {
    if (field.errors.length > 0) {
      errors[fieldKey] = [...field.errors];
    }

    if (field.dirty) {
      dirtyFields[fieldKey] = true;
    }

    if (field.touched) {
      touchedFields[fieldKey] = true;
    }
  });

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
