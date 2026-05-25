import { useMemo } from 'react';
import type { Form } from '../core/index';
import { createFormStateSummary } from '../adapters/FormStateSummary';
import type { UseFormStateReturn } from './types';
import { useFormSnapshot } from './useFormSnapshot';

/** form 전체 aggregate state를 반환한다. */
export function useFormStateWithForm<TValues>(form: Form<TValues>): UseFormStateReturn<TValues> {
  const state = useFormSnapshot(form);

  return useMemo(() => createFormStateSummary(state), [state]);
}
