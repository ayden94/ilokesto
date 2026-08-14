import type { Action } from 'svelte/action';
import type { Readable } from 'svelte/store';
import type { Form } from '../core/index';
import type { FormStateSummary } from '../adapters/FormStateSummary';
import type { RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';

export type { RegisterOptions } from '../adapters/dom';

export type SvelteRegisterAction = Action<HTMLElement, RegisterOptions>;

/** `useForm(form)`이 반환하는 Svelte action 중심 surface다. */
export type SvelteForm<TValues> = {
  form: Form<TValues>;
  /** `<input use:register={{ name: 'email' }} />`처럼 사용하는 Svelte action이다. */
  register: SvelteRegisterAction;
  /** form-wide aggregate state를 Svelte readable store로 반환한다. */
  useFormState(): Readable<FormStateSummary<TValues>>;
  /** submit event를 막고 core submit 흐름을 실행하는 handler factory다. */
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<Event, TResult>;
};
