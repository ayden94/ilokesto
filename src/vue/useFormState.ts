import type { Form, FormError, FormState } from '../core/index';
import type { VueFormStateReturn } from './types';
import { useFormSnapshot } from './useFormSnapshot';

/** form 전체 상태에서 Vue UI가 자주 쓰는 aggregate state를 반환한다. */
export function useFormStateWithForm<TValues>(form: Form<TValues>): VueFormStateReturn<TValues> {
  const snapshot = useFormSnapshot(form);
  const getState = () => snapshot.value;

  return {
    get state() {
      return getState();
    },
    get errors() {
      return collectErrors(getState());
    },
    get dirtyFields() {
      return collectFlaggedFields(getState(), 'dirty');
    },
    get touchedFields() {
      return collectFlaggedFields(getState(), 'touched');
    },
    get isDirty() {
      return Object.keys(this.dirtyFields).length > 0;
    },
    get isValid() {
      return Object.keys(this.errors).length === 0;
    },
    get isSubmitting() {
      return false;
    },
    get submitCount() {
      return getState().submitCount;
    },
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
