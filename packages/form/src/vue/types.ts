import type { MaybeRefOrGetter } from 'vue';
import type { CreateFormOptions, Form, FormError, FormState, ResetOptions } from '../core/index';
import type { DomValue, RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';

export type { RegisterOptions } from '../adapters/dom';

/**
 * Vue adapter가 form 생성 옵션에 더해 reactive external values를 받을 때 쓰는 옵션이다.
 *
 * @remarks
 * React 어댑터와 동일한 의미이지만, Vue의 반응형 모델에 맞춰 `values`를 `MaybeRefOrGetter<TValues>`로 받는다.
 * ref, computed, getter, 평면 값 모두 전달할 수 있으며 adapter는 `watch`로 참조 변화를 감지해 `form.reset()`을 호출한다.
 */
export type VueFormOptions<TValues> = CreateFormOptions<TValues> & {
  /** 외부 서버/query/props 값이다. ref, computed, getter, 평면 값 모두 가능하며 값이 바뀌면 adapter가 reset을 트리거한다. */
  values?: MaybeRefOrGetter<TValues>;
  /** `values` 변경으로 reset할 때 적용할 상태 보존 옵션이다. */
  resetOptions?: ResetOptions;
};

type VueBindingHandlers<TElement extends HTMLElement> = {
  onInput: (event: Event & { currentTarget: TElement }) => void;
  onChange: (event: Event & { currentTarget: TElement }) => void;
  onBlur: (event: FocusEvent & { currentTarget: TElement }) => void;
  onFocus: (event: FocusEvent & { currentTarget: TElement }) => void;
};

/** `<input v-bind="useRegister(...)" />`에 바로 전달할 수 있는 기본 binding props다. */
export type VueInputRegisterProps = VueBindingHandlers<HTMLInputElement> & {
  readonly name: string;
  readonly type: string;
  readonly value?: DomValue;
  readonly checked?: boolean;
};

/** `useRegister<HTMLSelectElement>(...)`로 좁혀 `<select>`에 spread할 수 있는 binding props다. */
export type VueSelectRegisterProps = VueBindingHandlers<HTMLSelectElement> & {
  readonly name: string;
  readonly value?: DomValue;
};

/** `useRegister<HTMLTextAreaElement>(...)`로 좁혀 `<textarea>`에 spread할 수 있는 binding props다. */
export type VueTextareaRegisterProps = VueBindingHandlers<HTMLTextAreaElement> & {
  readonly name: string;
  readonly value?: string | number;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type VueCustomRegisterProps<TElement extends HTMLElement = HTMLElement> = VueBindingHandlers<TElement> & {
  readonly name: string;
  readonly value?: unknown;
  readonly checked?: boolean;
};

export type VueRegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

/** element generic에 맞춘 Vue DOM-event-compatible field binding props다. */
export type VueRegisterPropsForElement<TElement extends VueRegisterElement> = TElement extends HTMLSelectElement
  ? VueSelectRegisterProps
  : TElement extends HTMLTextAreaElement
    ? VueTextareaRegisterProps
    : TElement extends HTMLInputElement
      ? VueInputRegisterProps
      : VueCustomRegisterProps<TElement>;

export type VueRegisterProps = VueRegisterPropsForElement<VueRegisterElement>;

export type VueRegisterPropsList<TElement extends VueRegisterElement, TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? VueRegisterPropsForElement<TElement> : never;
};

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type VueFieldReturn<TProps extends VueRegisterProps = VueInputRegisterProps> = {
  readonly props: TProps;
  readonly value: unknown;
  setValue(value: unknown): void;
  readonly errors: FormError[];
  readonly dirty: boolean;
  readonly touched: boolean;
};

/** form 전체 상태에서 Vue UI가 자주 쓰는 aggregate state다. */
export type VueFormStateReturn<TValues> = {
  readonly state: Readonly<FormState<TValues>>;
  readonly errors: Record<string, FormError[]>;
  readonly dirtyFields: Record<string, true>;
  readonly touchedFields: Record<string, true>;
  readonly focusedField: string | null;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly isSubmitting: boolean;
  readonly isSubmitted: boolean;
  readonly isSubmitSuccessful: boolean;
  readonly submitCount: number;
};

/** `useForm(form)`이 반환하는 form-bound composable 모음이다. */
export type VueForm<TValues> = {
  form: Form<TValues>;
  useRegister<TElement extends VueRegisterElement = HTMLInputElement>(options: RegisterOptions): VueRegisterPropsForElement<TElement>;
  useRegister<TElement extends VueRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(options: TOptions): VueRegisterPropsList<TElement, TOptions>;
  useRegister<TElement extends VueRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(...options: TOptions): VueRegisterPropsList<TElement, TOptions>;
  useField<TElement extends VueRegisterElement = HTMLInputElement>(options: RegisterOptions): VueFieldReturn<VueRegisterPropsForElement<TElement>>;
  useFormState(): VueFormStateReturn<TValues>;
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<Event, TResult>;
};
