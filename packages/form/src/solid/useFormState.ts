import type { Form } from '../core/index';
import { createFormStateSummary } from '../adapters/FormStateSummary';
import type { SolidFormStateReturn } from './types';
import { useFormSnapshot } from './useFormSnapshot';

/** form 전체 상태에서 Solid UI가 자주 쓰는 aggregate state를 반환한다. */
export function useFormStateWithForm<TValues>(form: Form<TValues>): SolidFormStateReturn<TValues> {
  const snapshot = useFormSnapshot(form);
  const getSummary = () => createFormStateSummary(snapshot());

  return {
    get state() {
      return snapshot();
    },
    get errors() {
      return getSummary().errors;
    },
    get dirtyFields() {
      return getSummary().dirtyFields;
    },
    get touchedFields() {
      return getSummary().touchedFields;
    },
    get focusedField() {
      return getSummary().focusedField;
    },
    get isDirty() {
      return getSummary().isDirty;
    },
    get isValid() {
      return getSummary().isValid;
    },
    get isSubmitting() {
      return getSummary().isSubmitting;
    },
    get isSubmitted() {
      return getSummary().isSubmitted;
    },
    get isSubmitSuccessful() {
      return getSummary().isSubmitSuccessful;
    },
    get submitCount() {
      return getSummary().submitCount;
    },
  };
}
