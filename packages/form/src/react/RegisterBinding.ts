import type { ChangeEvent } from 'react';
import type { FieldState, Form } from '../core/index';
import { createDomBinding, type FieldEventTarget, type RegisterOptions, fieldPathToDomName } from '../adapters/dom';
import type { RegisterElement, RegisterPropsForElement } from './types';

/** binding props를 생성한다. 이벤트 handler는 DOM event에서 값을 읽어 core form에 전달한다. */
export function createRegisterProps<TValues, TElement extends RegisterElement>(
  form: Form<TValues>,
  options: RegisterOptions,
  field: Readonly<FieldState>,
  domName: string,
): RegisterPropsForElement<TElement> {
  const binding = createDomBinding(form, options, () => field, domName);
  const props = {
    name: binding.name,
    type: binding.type,
    value: binding.value,
    checked: binding.checked,
    onChange: (event: ChangeEvent<HTMLElement>) => {
      binding.change(event.currentTarget as FieldEventTarget);
    },
    onBlur: () => {
      binding.blur();
    },
    onFocus: () => {
      binding.focus();
    },
  };

  return props as unknown as RegisterPropsForElement<TElement>;
}

export { fieldPathToDomName };
