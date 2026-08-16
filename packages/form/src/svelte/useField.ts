import { readable } from 'svelte/store';
import type { Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import type { RegisterOptions } from '../adapters/dom';
import { createRegisterAction } from './RegisterAction';
import type { SvelteFieldReturn, SvelteFieldSnapshot, SvelteRegisterAction } from './types';

/** 한 field의 binding action, reactive value/meta, setter를 함께 반환한다. */
export function useFieldWithForm<TValues>(form: Form<TValues>, options: RegisterOptions): SvelteFieldReturn {
  const props = createBoundRegisterAction(form, options);
  const getSnapshot = (): SvelteFieldSnapshot => {
    const field = getFieldState(form, form.getState(), options.name);
    return {
      dirty: field.dirty,
      errors: [...field.errors],
      touched: field.touched,
      value: field.value,
    };
  };
  const field = readable(getSnapshot(), (set) => {
    set(getSnapshot());
    return form.subscribe(() => set(getSnapshot()));
  });

  return Object.assign(field, {
    props,
    setValue(value: unknown) {
      form.setValue(options.name, value, { source: 'program' });
    },
  });
}

function createBoundRegisterAction<TValues>(form: Form<TValues>, options: RegisterOptions): SvelteRegisterAction {
  const register = createRegisterAction(form);

  return (node, overrideOptions) => register(node, overrideOptions ?? options);
}
