import type { Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import { createRegisterProps, fieldPathToDomName } from './RegisterBinding';
import type { RegisterOptions, SolidRegisterElement, SolidRegisterPropsForElement, SolidRegisterPropsList } from './types';
import { useFieldSchemaRegistrations } from './useFieldSchemaRegistration';
import { useFormSnapshot } from './useFormSnapshot';

export function useRegisterWithForm<TValues, TElement extends SolidRegisterElement = HTMLInputElement>(form: Form<TValues>, options: RegisterOptions): SolidRegisterPropsForElement<TElement>;
export function useRegisterWithForm<TValues, TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(form: Form<TValues>, options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
export function useRegisterWithForm<TValues, TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(form: Form<TValues>, ...options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
export function useRegisterWithForm<TValues>(form: Form<TValues>, first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]): SolidRegisterPropsForElement<SolidRegisterElement> | SolidRegisterPropsForElement<SolidRegisterElement>[];

/** 단일 또는 여러 field의 Solid binding props를 만든다. */
export function useRegisterWithForm<TValues>(
  form: Form<TValues>,
  first: RegisterOptions | readonly RegisterOptions[],
  ...rest: readonly RegisterOptions[]
): SolidRegisterPropsForElement<SolidRegisterElement> | SolidRegisterPropsForElement<SolidRegisterElement>[] {
  const shouldReturnList = Array.isArray(first) || rest.length > 0;
  const options = normalizeRegisterOptions(first, rest);

  useFieldSchemaRegistrations(form, options);

  const snapshot = useFormSnapshot(form);
  const bindings = options.map(option => createRegisterProps(
    form,
    option,
    () => getFieldState(form, snapshot(), option.name),
    fieldPathToDomName(option.name),
  ));

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
