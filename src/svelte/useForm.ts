import type { Form } from '../core/index';
import type { SvelteForm } from './types';
import { createRegisterAction } from './RegisterAction';
import { useFormStateWithForm } from './useFormState';

/** Svelte action surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): SvelteForm<TValues> {
  return {
    form,
    register: createRegisterAction(form),
    useFormState() {
      return useFormStateWithForm(form);
    },
  };
}
