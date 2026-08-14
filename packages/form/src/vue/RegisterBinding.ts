import type { FieldState, Form } from '../core/index';
import { createDomBinding, type FieldEventTarget, type RegisterOptions, fieldPathToDomName } from '../adapters/dom';
import type { VueRegisterElement, VueRegisterPropsForElement } from './types';

/** Vue v-bind용 binding props를 생성한다. */
export function createRegisterProps<TValues, TElement extends VueRegisterElement>(
  form: Form<TValues>,
  options: RegisterOptions,
  getField: () => Readonly<FieldState>,
  domName: string,
): VueRegisterPropsForElement<TElement> {
  const binding = createDomBinding(form, options, getField, domName);
  const props = {
    name: binding.name,
    type: binding.type,
    get value() {
      return binding.value;
    },
    get checked() {
      return binding.checked;
    },
    onInput: (event: Event & { currentTarget: HTMLElement }) => {
      binding.input(event.currentTarget as FieldEventTarget);
    },
    onChange: (event: Event & { currentTarget: HTMLElement }) => {
      binding.change(event.currentTarget as FieldEventTarget);
    },
    onBlur: () => {
      binding.blur();
    },
    onFocus: () => {
      binding.focus();
    },
  };

  return props as unknown as VueRegisterPropsForElement<TElement>;
}

export { fieldPathToDomName };
