import { useCallback, useMemo } from 'react';
import type { Form } from '../core/index';
import type { RegisterElement, RegisterOptions, RegisterPropsForElement, UseFieldReturn } from './types';
import { createRegisterProps, fieldPathToDomName } from './RegisterBinding';
import { getFieldState } from '../adapters/dom';
import { useFieldSchemaRegistration } from './useFieldSchemaRegistration';
import { useFormSnapshot } from './useFormSnapshot';

/** 한 field의 binding, value, meta, setter를 함께 반환한다. */
export function useFieldWithForm<TValues, TElement extends RegisterElement = HTMLInputElement>(form: Form<TValues>, options: RegisterOptions): UseFieldReturn<RegisterPropsForElement<TElement>> {
  useFieldSchemaRegistration(form, options);

  const state = useFormSnapshot(form);
  const field = getFieldState(form, state, options.name);
  const domName = fieldPathToDomName(options.name);
  const props = useMemo(() => createRegisterProps<TValues, TElement>(form, options, field, domName), [form, options, field, domName]);

  const setValue = useCallback((value: unknown) => {
    form.setValue(options.name, value, { source: 'program' });
  }, [form, options.name]);

  return useMemo(() => ({
    props,
    value: field.value,
    setValue,
    errors: [...field.errors],
    dirty: field.dirty,
    touched: field.touched,
  }), [field, props, setValue]);
}
