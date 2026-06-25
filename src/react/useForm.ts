import { useMemo, useRef } from 'react';
import { createSubmitHandler } from '../adapters/dom';
import { createFormFromOptions, isFormInstance, type FormInput } from '../adapters/FormInput';
import type { CreateFormOptions, Form } from '../core/index';
import type { ReactForm, RegisterOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** React hook surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): ReactForm<TValues>;
export function useForm<TValues>(options: CreateFormOptions<TValues>): ReactForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues>): ReactForm<TValues> {
  const optionsFormRef = useRef<Form<TValues> | undefined>(undefined);
  const form = isFormInstance(input)
    ? input
    : (optionsFormRef.current ??= createFormFromOptions(input));
  const useRegister = ((
    first: RegisterOptions | readonly RegisterOptions[],
    ...rest: readonly RegisterOptions[]
  ) => useRegisterWithForm(form, first, ...rest)) as ReactForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) =>
    useFieldWithForm(form, options)) as ReactForm<TValues>['useField'];
  const useFormState = (): ReturnType<ReactForm<TValues>['useFormState']> =>
    useFormStateWithForm(form);
  const handleSubmit = ((onValid, onInvalid) =>
    createSubmitHandler(form, onValid, onInvalid)) as ReactForm<TValues>['handleSubmit'];

  return useMemo(() => ({ form, useRegister, useField, useFormState, handleSubmit }), [form]);
}
