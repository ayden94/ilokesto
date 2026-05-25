import type { Form } from '../core/index';
import type { RegisterOptions, SolidForm } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** Solid helper surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): SolidForm<TValues> {
  const useRegister = ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as SolidForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) => useFieldWithForm(form, options)) as SolidForm<TValues>['useField'];
  const useFormState = (): ReturnType<SolidForm<TValues>['useFormState']> => useFormStateWithForm(form);

  return { form, useRegister, useField, useFormState };
}
