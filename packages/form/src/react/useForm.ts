import { useEffect, useMemo, useRef } from 'react';
import { createSubmitHandler } from '../adapters/dom';
import {
  createExternalValuesSynchronizer,
  createFormFromOptions,
  isFormInstance,
  type FormInput,
} from '../adapters/FormInput';
import type { FieldPathInput, Form } from '../core/index';
import type { ReactForm, ReactFormOptions, RegisterOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFieldStateWithForm } from './useFieldState';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** React hook surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): ReactForm<TValues>;
export function useForm<TValues>(options: ReactFormOptions<TValues>): ReactForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues, ReactFormOptions<TValues>>): ReactForm<TValues> {
  const optionsFormRef = useRef<Form<TValues> | undefined>(undefined);
  const isForm = isFormInstance(input);
  const form = isForm
    ? input
    : (optionsFormRef.current ??= createFormFromOptions(input));
  const values = isForm ? undefined : input.values;
  const resetOptions = isForm ? undefined : input.resetOptions;
  const synchronizeValues = useMemo(() => createExternalValuesSynchronizer(form), [form]);

  useEffect(() => {
    synchronizeValues(values, resetOptions);
  }, [resetOptions, synchronizeValues, values]);

  const useRegister = ((
    first: RegisterOptions | readonly RegisterOptions[],
    ...rest: readonly RegisterOptions[]
  ) => useRegisterWithForm(form, first, ...rest)) as ReactForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) =>
    useFieldWithForm(form, options)) as ReactForm<TValues>['useField'];
  const useFieldState = ((name: FieldPathInput) =>
    useFieldStateWithForm(form, name)) as ReactForm<TValues>['useFieldState'];
  const useFormState = (): ReturnType<ReactForm<TValues>['useFormState']> =>
    useFormStateWithForm(form);
  const handleSubmit = ((onValid, onInvalid) =>
    createSubmitHandler(form, onValid, onInvalid)) as ReactForm<TValues>['handleSubmit'];

  return useMemo(() => ({ form, useRegister, useField, useFieldState, useFormState, handleSubmit }), [form]);
}
