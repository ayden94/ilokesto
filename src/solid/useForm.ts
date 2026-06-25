import { createSubmitHandler } from '../adapters/dom';
import { createFormFromOptions, isFormInstance, type FormInput } from '../adapters/FormInput';
import type { CreateFormOptions, Form } from '../core/index';
import type { RegisterOptions, SolidForm } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** Solid helper surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): SolidForm<TValues>;
export function useForm<TValues>(options: CreateFormOptions<TValues>): SolidForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues>): SolidForm<TValues> {
  const form = isFormInstance(input) ? input : createFormFromOptions(input);
  const useRegister = ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as SolidForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) => useFieldWithForm(form, options)) as SolidForm<TValues>['useField'];
  const useFormState = (): ReturnType<SolidForm<TValues>['useFormState']> => useFormStateWithForm(form);
  const handleSubmit = ((onValid, onInvalid) => createSubmitHandler(form, onValid, onInvalid)) as SolidForm<TValues>['handleSubmit'];

  return { form, useRegister, useField, useFormState, handleSubmit };
}
