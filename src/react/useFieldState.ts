import type { FieldPathInput, Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import type { UseFieldStateReturn } from './types';
import { useFormSnapshot } from './useFormSnapshot';

/** 한 field의 value와 meta를 typed path 기준으로 반환한다. */
export function useFieldStateWithForm<TValues, const TName extends FieldPathInput>(form: Form<TValues>, name: TName): UseFieldStateReturn<TValues, TName> {
  const state = useFormSnapshot(form);

  return getFieldState(form, state, name) as UseFieldStateReturn<TValues, TName>;
}
