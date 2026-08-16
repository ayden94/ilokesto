import { createRenderEffect, getOwner } from 'solid-js';
import { createSubmitHandler } from '../adapters/dom';
import {
  createExternalValuesSynchronizer,
  createFormFromOptions,
  isFormInstance,
  type FormInput,
} from '../adapters/FormInput';
import type { Form } from '../core/index';
import type { RegisterOptions, SolidForm, SolidFormOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** Solid helper surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): SolidForm<TValues>;
export function useForm<TValues>(options: SolidFormOptions<TValues>): SolidForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues, SolidFormOptions<TValues>>): SolidForm<TValues> {
  const isForm = isFormInstance(input);
  if (!isForm && input.values !== undefined && getOwner() === null) {
    throw new TypeError('Reactive Solid form options require an active owner');
  }

  const form = isForm ? input : createFormFromOptions(input);
  if (!isForm && input.values !== undefined) {
    const synchronizeValues = createExternalValuesSynchronizer(form);
    const values = input.values;
    const resetOptions = input.resetOptions;
    createRenderEffect(() => {
      synchronizeValues(values(), resetOptions);
    });
  }

  const useRegister = ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as SolidForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) => useFieldWithForm(form, options)) as SolidForm<TValues>['useField'];
  const useFormState = (): ReturnType<SolidForm<TValues>['useFormState']> => useFormStateWithForm(form);
  const handleSubmit = ((onValid, onInvalid) => createSubmitHandler(form, onValid, onInvalid)) as SolidForm<TValues>['handleSubmit'];

  return { form, useRegister, useField, useFormState, handleSubmit };
}
