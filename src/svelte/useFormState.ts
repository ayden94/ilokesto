import { readable, type Readable } from 'svelte/store';
import type { Form } from '../core/index';
import { createFormStateSummary, type FormStateSummary } from '../adapters/FormStateSummary';

/** form 전체 aggregate state를 Svelte readable store로 연결한다. */
export function useFormStateWithForm<TValues>(form: Form<TValues>): Readable<FormStateSummary<TValues>> {
  return readable(createFormStateSummary(form.getState()), set => {
    set(createFormStateSummary(form.getState()));

    return form.subscribe(() => {
      set(createFormStateSummary(form.getState()));
    });
  });
}
