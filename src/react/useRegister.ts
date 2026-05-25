import { useMemo } from 'react';
import type { Form } from '../core/index';
import type { RegisterOptions, RegisterProps, RegisterPropsFor, RegisterPropsList } from './types';
import { getFieldState } from './FieldValue';
import { createRegisterProps, fieldPathToDomName } from './RegisterBinding';
import { useFieldSchemaRegistrations } from './useFieldSchemaRegistration';
import { useFormSnapshot } from './useFormSnapshot';

export function useRegisterWithForm<TValues, TOptions extends RegisterOptions>(form: Form<TValues>, options: TOptions): RegisterPropsFor<TOptions>;
export function useRegisterWithForm<TValues, TOptions extends readonly RegisterOptions[]>(form: Form<TValues>, options: TOptions): RegisterPropsList<TOptions>;
export function useRegisterWithForm<TValues, TOptions extends readonly RegisterOptions[]>(form: Form<TValues>, ...options: TOptions): RegisterPropsList<TOptions>;
export function useRegisterWithForm<TValues>(form: Form<TValues>, first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]): RegisterProps | RegisterProps[];

/** 단일 또는 여러 field의 DOM binding props를 만든다. */
export function useRegisterWithForm<TValues>(
  form: Form<TValues>,
  first: RegisterOptions | readonly RegisterOptions[],
  ...rest: readonly RegisterOptions[]
): RegisterProps | RegisterProps[] {
  const shouldReturnList = Array.isArray(first) || rest.length > 0;
  const options = normalizeRegisterOptions(first, rest);

  useFieldSchemaRegistrations(form, options);

  const state = useFormSnapshot(form);
  const bindings = useMemo(
    () => options.map(option => {
      const field = getFieldState(form, state, option.name);
      const domName = fieldPathToDomName(option.name);

      return createRegisterProps(form, option, field, domName);
    }),
    [form, options, state],
  );

  return shouldReturnList ? bindings : bindings[0];
}

function normalizeRegisterOptions(first: RegisterOptions | readonly RegisterOptions[], rest: readonly RegisterOptions[]): readonly RegisterOptions[] {
  if (Array.isArray(first)) {
    return first as readonly RegisterOptions[];
  }

  if (rest.length > 0) {
    return [first as RegisterOptions, ...rest];
  }

  return [first as RegisterOptions];
}
