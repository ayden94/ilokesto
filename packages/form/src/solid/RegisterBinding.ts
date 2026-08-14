import type { FieldState, Form } from '../core/index';
import { createDomBinding, type FieldEventTarget, type RegisterOptions, fieldPathToDomName } from '../adapters/dom';
import type { SolidRegisterElement, SolidRegisterPropsForElement } from './types';

/** Solid JSX spread용 binding props를 생성한다. */
export function createRegisterProps<TValues, TElement extends SolidRegisterElement>(
  form: Form<TValues>,
  options: RegisterOptions,
  getField: () => Readonly<FieldState>,
  domName: string,
): SolidRegisterPropsForElement<TElement> {
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
    onInput: (event: InputEvent & { currentTarget: HTMLElement }) => {
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

  return props as unknown as SolidRegisterPropsForElement<TElement>;
}

export { fieldPathToDomName };
