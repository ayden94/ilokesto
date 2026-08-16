import { createSubmitHandler } from '../adapters/dom';
import { createFormFromOptions, isFormInstance, type FormInput } from '../adapters/FormInput';
import type { CreateFormOptions, Form } from '../core/index';
import type { SvelteForm } from './types';
import { createRegisterAction } from './RegisterAction';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';

/** Svelte action surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): SvelteForm<TValues>;
export function useForm<TValues>(options: CreateFormOptions<TValues>): SvelteForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues>): SvelteForm<TValues> {
  const form = isFormInstance(input) ? input : createFormFromOptions(input);
  return {
    form,
    register: createRegisterAction(form),
    useField(options) {
      return useFieldWithForm(form, options);
    },
    useFormState() {
      return useFormStateWithForm(form);
    },
    handleSubmit(onValid, onInvalid) {
      return createSubmitHandler(form, onValid, onInvalid);
    },
  };
}
