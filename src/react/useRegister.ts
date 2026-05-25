import { useMemo } from 'react';
import type { Form } from '../core/index';
import type { RegisterOptions, RegisterPropsFor } from './types';
import { getFieldState } from './FieldValue';
import { createRegisterProps, fieldPathToDomName } from './RegisterBinding';
import { useFieldSchemaRegistration, useFieldSchemaRegistrations } from './useFieldSchemaRegistration';
import { useFormSnapshot } from './useFormSnapshot';

type RegisterPropsList<TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? RegisterPropsFor<TOptions[Index]> : never;
};

/** 단일 field의 DOM binding props를 만든다. */
export function useRegisterWithForm<TValues, TOptions extends RegisterOptions>(form: Form<TValues>, options: TOptions): RegisterPropsFor<TOptions> {
  useFieldSchemaRegistration(form, options);

  const state = useFormSnapshot(form);
  const field = getFieldState(form, state, options.name);
  const domName = fieldPathToDomName(options.name);

  return useMemo(() => createRegisterProps(form, options, field, domName), [form, options, field, domName]);
}

/** 여러 field binding을 하나의 hook 호출 안에서 만든다. */
export function useRegistersWithForm<TValues, TOptions extends readonly RegisterOptions[]>(form: Form<TValues>, options: TOptions): RegisterPropsList<TOptions> {
  useFieldSchemaRegistrations(form, options);

  const state = useFormSnapshot(form);

  return useMemo(
    () => options.map(option => {
      const field = getFieldState(form, state, option.name);
      const domName = fieldPathToDomName(option.name);

      return createRegisterProps(form, option, field, domName);
    }) as RegisterPropsList<TOptions>,
    [form, options, state],
  );
}
