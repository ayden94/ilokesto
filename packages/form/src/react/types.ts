import type {
  ChangeEventHandler,
  FocusEventHandler,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  FormEvent,
} from 'react';
import type { CreateFormOptions, FieldPathInput, FieldPathValue, FieldState, Form, FormError, FormState, ResetOptions } from '../core/index';
import type { RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';

export type { RegisterOptions } from '../adapters/dom';

/** React adapter가 form 생성 옵션에 더해 reactive external values를 받을 때 쓰는 옵션이다. */
export type ReactFormOptions<TValues> = CreateFormOptions<TValues> & {
  /** 외부 서버/query/props 값이다. reference가 바뀌면 adapter가 reset을 트리거한다. */
  values?: TValues;
  /** `values` 변경으로 reset할 때 적용할 상태 보존 옵션이다. */
  resetOptions?: ResetOptions;
};

type InputValue = InputHTMLAttributes<HTMLInputElement>['value'];
type InputType = InputHTMLAttributes<HTMLInputElement>['type'];
type SelectValue = SelectHTMLAttributes<HTMLSelectElement>['value'];
type TextareaValue = TextareaHTMLAttributes<HTMLTextAreaElement>['value'];

type BindingHandlers<TElement extends HTMLElement> = {
  onChange: ChangeEventHandler<TElement>;
  onBlur: FocusEventHandler<TElement>;
  onFocus: FocusEventHandler<TElement>;
};

/** `<input {...useRegister(...)} />`에 바로 spread할 수 있는 기본 binding props다. */
export type InputRegisterProps = BindingHandlers<HTMLInputElement> & {
  name: string;
  type: InputType;
  value?: InputValue;
  checked?: boolean;
};

/** `useRegister<HTMLSelectElement>(...)`로 좁혀 `<select>`에 spread할 수 있는 binding props다. */
export type SelectRegisterProps = BindingHandlers<HTMLSelectElement> & {
  name: string;
  value?: SelectValue;
};

/** `useRegister<HTMLTextAreaElement>(...)`로 좁혀 `<textarea>`에 spread할 수 있는 binding props다. */
export type TextareaRegisterProps = BindingHandlers<HTMLTextAreaElement> & {
  name: string;
  value?: TextareaValue;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type CustomRegisterProps<TElement extends HTMLElement = HTMLElement> = BindingHandlers<TElement> & {
  name: string;
  value?: unknown;
  checked?: boolean;
};

export type RegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

/** element generic에 맞춘 DOM-event-compatible field binding props다. */
export type RegisterPropsForElement<TElement extends RegisterElement> = TElement extends HTMLSelectElement
  ? SelectRegisterProps
  : TElement extends HTMLTextAreaElement
    ? TextareaRegisterProps
    : TElement extends HTMLInputElement
      ? InputRegisterProps
      : CustomRegisterProps<TElement>;

export type RegisterProps = RegisterPropsForElement<RegisterElement>;

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type UseFieldReturn<TProps extends RegisterProps = InputRegisterProps> = {
  props: TProps;
  value: unknown;
  setValue: (value: unknown) => void;
  errors: FormError[];
  dirty: boolean;
  touched: boolean;
};

/** 한 field의 value와 meta를 form values 타입과 path에서 추론해 반환한다. */
export type UseFieldStateReturn<TValues, TName extends FieldPathInput> = Readonly<FieldState<FieldPathValue<TValues, TName>>>;

/** form 전체 상태에서 React UI가 자주 쓰는 aggregate state다. */
export type UseFormStateReturn<TValues> = {
  state: Readonly<FormState<TValues>>;
  errors: Record<string, FormError[]>;
  dirtyFields: Record<string, true>;
  touchedFields: Record<string, true>;
  focusedField: string | null;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  submitCount: number;
};

export type RegisterPropsList<TElement extends RegisterElement, TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? RegisterPropsForElement<TElement> : never;
};

/** `useForm(form)`이 반환하는 form-bound hook 모음이다. */
export type ReactForm<TValues> = {
  form: Form<TValues>;
  useRegister<TElement extends RegisterElement = HTMLInputElement>(options: RegisterOptions): RegisterPropsForElement<TElement>;
  useRegister<TElement extends RegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(options: TOptions): RegisterPropsList<TElement, TOptions>;
  useRegister<TElement extends RegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(...options: TOptions): RegisterPropsList<TElement, TOptions>;
  useField<TElement extends RegisterElement = HTMLInputElement>(options: RegisterOptions): UseFieldReturn<RegisterPropsForElement<TElement>>;
  useFieldState<const TName extends FieldPathInput>(name: TName): UseFieldStateReturn<TValues, TName>;
  useFormState(): UseFormStateReturn<TValues>;
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<FormEvent<HTMLFormElement>, TResult>;
};
