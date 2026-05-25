import { useMemo } from 'react';
import type { Form } from '../core/index';
import type { ReactForm, RegisterOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegistersWithForm, useRegisterWithForm } from './useRegister';

/** React hook surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): ReactForm<TValues> {
  const useRegister = (<TOptions extends RegisterOptions>(options: TOptions) => useRegisterWithForm(form, options)) as ReactForm<TValues>['useRegister'];
  const useRegisters = (<TOptions extends readonly RegisterOptions[]>(options: TOptions) => useRegistersWithForm(form, options)) as ReactForm<TValues>['useRegisters'];
  const useField = (<TOptions extends RegisterOptions>(options: TOptions) => useFieldWithForm(form, options)) as ReactForm<TValues>['useField'];
  const useFormState = (): ReturnType<ReactForm<TValues>['useFormState']> => useFormStateWithForm(form);

  return useMemo(() => ({ form, useRegister, useRegisters, useField, useFormState }), [form]);
}
