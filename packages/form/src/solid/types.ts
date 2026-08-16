import type { Form, FormError, FormState } from '../core/index';
import type { DomValue, RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';

export type { RegisterOptions } from '../adapters/dom';

type SolidBindingHandlers<TElement extends HTMLElement> = {
  onInput: (event: InputEvent & { currentTarget: TElement }) => void;
  onChange: (event: Event & { currentTarget: TElement }) => void;
  onBlur: (event: FocusEvent & { currentTarget: TElement }) => void;
  onFocus: (event: FocusEvent & { currentTarget: TElement }) => void;
};

/** `<input {...useRegister(...)} />`에 바로 spread할 수 있는 기본 binding props다. */
export type SolidInputRegisterProps = SolidBindingHandlers<HTMLInputElement> & {
  readonly name: string;
  readonly type: string;
  readonly value?: DomValue;
  readonly checked?: boolean;
};

/** `useRegister<HTMLSelectElement>(...)`로 좁혀 `<select>`에 spread할 수 있는 binding props다. */
export type SolidSelectRegisterProps = SolidBindingHandlers<HTMLSelectElement> & {
  readonly name: string;
  readonly value?: DomValue;
};

/** `useRegister<HTMLTextAreaElement>(...)`로 좁혀 `<textarea>`에 spread할 수 있는 binding props다. */
export type SolidTextareaRegisterProps = SolidBindingHandlers<HTMLTextAreaElement> & {
  readonly name: string;
  readonly value?: string | number;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type SolidCustomRegisterProps<TElement extends HTMLElement = HTMLElement> = SolidBindingHandlers<TElement> & {
  readonly name: string;
  readonly value?: unknown;
  readonly checked?: boolean;
};

export type SolidRegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

/** element generic에 맞춘 Solid DOM-event-compatible field binding props다. */
export type SolidRegisterPropsForElement<TElement extends SolidRegisterElement> = TElement extends HTMLSelectElement
  ? SolidSelectRegisterProps
  : TElement extends HTMLTextAreaElement
    ? SolidTextareaRegisterProps
    : TElement extends HTMLInputElement
      ? SolidInputRegisterProps
      : SolidCustomRegisterProps<TElement>;

export type SolidRegisterProps = SolidRegisterPropsForElement<SolidRegisterElement>;

export type SolidRegisterPropsList<TElement extends SolidRegisterElement, TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? SolidRegisterPropsForElement<TElement> : never;
};

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type SolidFieldReturn<TProps extends SolidRegisterProps = SolidInputRegisterProps> = {
  readonly props: TProps;
  readonly value: unknown;
  setValue(value: unknown): void;
  readonly errors: FormError[];
  readonly dirty: boolean;
  readonly touched: boolean;
};

/** form 전체 상태에서 Solid UI가 자주 쓰는 aggregate state다. */
export type SolidFormStateReturn<TValues> = {
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

/** `useForm(form)`이 반환하는 form-bound helper 모음이다. */
export type SolidForm<TValues> = {
  form: Form<TValues>;
  useRegister<TElement extends SolidRegisterElement = HTMLInputElement>(options: RegisterOptions): SolidRegisterPropsForElement<TElement>;
  useRegister<TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
  useRegister<TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(...options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
  useField<TElement extends SolidRegisterElement = HTMLInputElement>(options: RegisterOptions): SolidFieldReturn<SolidRegisterPropsForElement<TElement>>;
  useFormState(): SolidFormStateReturn<TValues>;
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<Event, TResult>;
};
