import type { Action } from 'svelte/action';
import type { Readable } from 'svelte/store';
import type { Form, FormError } from '../core/index';
import type { FormStateSummary } from '../adapters/FormStateSummary';
import type { RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';

export type { RegisterOptions } from '../adapters/dom';

export type SvelteRegisterAction = Action<HTMLElement, RegisterOptions>;

/** 한 field의 binding action, value, meta, setter를 함께 제공한다. */
export type SvelteFieldReturn = {
  /** `<input use:props />`에 바로 전달할 수 있는, options가 고정된 register action이다. */
  readonly props: SvelteRegisterAction;
  /** 현재 field value다. */
  readonly value: unknown;
  /** field value를 programmatic하게 갱신한다. */
  setValue(value: unknown): void;
  /** 현재 field에 붙어 있는 validation errors다. */
  readonly errors: FormError[];
  /** 현재 값이 initial value와 다른지 여부다. */
  readonly dirty: boolean;
  /** field가 한 번 이상 blur 되었는지 여부다. */
  readonly touched: boolean;
};

/** `useForm(form)`이 반환하는 Svelte action 중심 surface다. */
export type SvelteForm<TValues> = {
  form: Form<TValues>;
  /** `<input use:register={{ name: 'email' }} />`처럼 사용하는 Svelte action이다. */
  register: SvelteRegisterAction;
  /** 한 field의 binding, value, meta, setter를 함께 반환한다. */
  useField(options: RegisterOptions): SvelteFieldReturn;
  /** form-wide aggregate state를 Svelte readable store로 반환한다. */
  useFormState(): Readable<FormStateSummary<TValues>>;
  /** submit event를 막고 core submit 흐름을 실행하는 handler factory다. */
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<Event, TResult>;
};
