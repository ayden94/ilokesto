import type { Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import { createRegisterProps, fieldPathToDomName } from './RegisterBinding';
import type { RegisterOptions, VueFieldReturn, VueRegisterElement, VueRegisterPropsForElement } from './types';
import { useFieldSchemaRegistrations } from './useFieldSchemaRegistration';
import { useFormSnapshot } from './useFormSnapshot';

/** 한 field의 binding, value, meta, setter를 함께 반환한다. */
export function useFieldWithForm<TValues, TElement extends VueRegisterElement = HTMLInputElement>(form: Form<TValues>, options: RegisterOptions): VueFieldReturn<VueRegisterPropsForElement<TElement>> {
  useFieldSchemaRegistrations(form, [options]);

  const snapshot = useFormSnapshot(form);
  const getField = () => getFieldState(form, snapshot.value, options.name);
  const props = createRegisterProps<TValues, TElement>(form, options, getField, fieldPathToDomName(options.name));

  return {
    props,
    get value() {
      return getField().value;
    },
    setValue(value: unknown) {
      form.setValue(options.name, value, { source: 'program' });
    },
    get errors() {
      return [...getField().errors];
    },
    get dirty() {
      return getField().dirty;
    },
    get touched() {
      return getField().touched;
    },
  };
}
