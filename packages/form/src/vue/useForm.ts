import { getCurrentScope, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { createSubmitHandler } from '../adapters/dom';
import { createExternalValuesSynchronizer, createFormFromOptions, isFormInstance } from '../adapters/FormInput';
import type { Form, ResetOptions } from '../core/index';
import type { RegisterOptions, VueForm, VueFormOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** Vue composable surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): VueForm<TValues>;
export function useForm<TValues>(options: VueFormOptions<TValues>): VueForm<TValues>;
export function useForm<TValues>(input: Form<TValues> | VueFormOptions<TValues>): VueForm<TValues> {
  const isForm = isFormInstance(input);
  if (!isForm && input.values !== undefined && getCurrentScope() === undefined) {
    throw new TypeError('Reactive Vue form options require an active effect scope');
  }

  let form: Form<TValues>;
  let values: MaybeRefOrGetter<TValues | undefined> | undefined;
  let resetOptions: ResetOptions | undefined;

  if (isForm) {
    form = input;
    values = undefined;
    resetOptions = undefined;
  } else {
    const {
      values: reactiveValues,
      resetOptions: reactiveResetOptions,
      ...createOptions
    } = input;

    form = createFormFromOptions(createOptions);
    values = reactiveValues;
    resetOptions = reactiveResetOptions;
  }

  if (values !== undefined) {
    const synchronizeValues = createExternalValuesSynchronizer(form);

    synchronizeValues(toValue(values), resetOptions);

    watch(
      () => toValue(values),
      nextValues => {
        synchronizeValues(nextValues, resetOptions);
      },
    );
  }

  const useRegister = ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as VueForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) => useFieldWithForm(form, options)) as VueForm<TValues>['useField'];
  const useFormState = (): ReturnType<VueForm<TValues>['useFormState']> => useFormStateWithForm(form);
  const handleSubmit = ((onValid, onInvalid) => createSubmitHandler(form, onValid, onInvalid)) as VueForm<TValues>['handleSubmit'];

  return { form, useRegister, useField, useFormState, handleSubmit };
}
