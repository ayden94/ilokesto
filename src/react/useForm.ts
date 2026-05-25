import { useMemo } from 'react';
import type { Form } from '../core/index';
import type { ReactForm, RegisterOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** React hook surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): ReactForm<TValues> {
  return useMemo(() => ({ form, useRegister: ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as ReactForm<TValues>['useRegister'], useField:(<TOptions extends RegisterOptions>(options: TOptions) => useFieldWithForm(form, options)) as ReactForm<TValues>['useField'], useFormState: (): ReturnType<ReactForm<TValues>['useFormState']> => useFormStateWithForm(form) }), [form]);
}
