import { onDestroy } from 'svelte';
import { createSubmitHandler } from '../adapters/dom';
import {
  createExternalValuesSynchronizer,
  createFormFromOptions,
  isFormInstance,
  type FormInput,
} from '../adapters/FormInput';
import type { Form } from '../core/index';
import type { SvelteForm, SvelteFormOptions } from './types';
import { createRegisterAction } from './RegisterAction';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';

/** Svelte action surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): SvelteForm<TValues>;
export function useForm<TValues>(options: SvelteFormOptions<TValues>): SvelteForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues, SvelteFormOptions<TValues>>): SvelteForm<TValues> {
  const form = isFormInstance(input) ? input : createFormFromOptions(input);
  if (!isFormInstance(input) && input.values !== undefined) {
    const synchronizeValues = createExternalValuesSynchronizer(form);
    const resetOptions = input.resetOptions;
    let unsubscribe: (() => void) | undefined;
    onDestroy(() => {
      unsubscribe?.();
    });
    unsubscribe = input.values.subscribe(values => {
      synchronizeValues(values, resetOptions);
    });
  }

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
