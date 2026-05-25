import type { Form } from '../core/index';
import type { RegisterOptions, VueForm } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** Vue composable surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): VueForm<TValues> {
  const useRegister = ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as VueForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) => useFieldWithForm(form, options)) as VueForm<TValues>['useField'];
  const useFormState = (): ReturnType<VueForm<TValues>['useFormState']> => useFormStateWithForm(form);

  return { form, useRegister, useField, useFormState };
}
