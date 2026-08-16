import type { Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import type { RegisterOptions } from '../adapters/dom';
import { createRegisterAction } from './RegisterAction';
import type { SvelteFieldReturn, SvelteRegisterAction } from './types';

/** 한 field의 binding action, reactive value/meta, setter를 함께 반환한다. */
export function useFieldWithForm<TValues>(form: Form<TValues>, options: RegisterOptions): SvelteFieldReturn {
  const props = createBoundRegisterAction(form, options);

  return {
    props,
    get value() {
      return getFieldState(form, form.getState(), options.name).value;
    },
    setValue(value: unknown) {
      form.setValue(options.name, value, { source: 'program' });
    },
    get errors() {
      return [...getFieldState(form, form.getState(), options.name).errors];
    },
    get dirty() {
      return getFieldState(form, form.getState(), options.name).dirty;
    },
    get touched() {
      return getFieldState(form, form.getState(), options.name).touched;
    },
  };
}

function createBoundRegisterAction<TValues>(form: Form<TValues>, options: RegisterOptions): SvelteRegisterAction {
  const register = createRegisterAction(form);

  return (node, overrideOptions) => register(node, overrideOptions ?? options);
}