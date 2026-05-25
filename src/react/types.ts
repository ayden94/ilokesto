import type {
  ChangeEventHandler,
  FocusEventHandler,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import type { FieldPathInput, Form, FormError, FormState, StandardSchemaV1 } from '../core/index';

type InputValue = InputHTMLAttributes<HTMLInputElement>['value'];
type SelectValue = SelectHTMLAttributes<HTMLSelectElement>['value'];
type TextareaValue = TextareaHTMLAttributes<HTMLTextAreaElement>['value'];

/** React adapter가 field hook에서 공통으로 받는 옵션이다. */
export type FieldHookOptions = {
  /** core form field path다. string은 하나의 field 이름으로 취급하고, tuple은 nested path를 표현한다. */
  name: FieldPathInput;
  /** 이 field에만 적용할 schema다. form-level schema보다 우선한다. */
  schema?: StandardSchemaV1<unknown, unknown>;
  /** field-local schema validate 함수에 넘길 옵션이다. */
  schemaOptions?: StandardSchemaV1.Options;
};

/** DOM control 종류별 binding 보정 옵션이다. */
export type RegisterOptions = FieldHookOptions & {
  /** radio/checkbox처럼 DOM value와 form value를 구분해야 할 때 사용한다. */
  value?: unknown;
  /** checkbox가 check될 때 쓸 값이다. 생략하면 boolean checkbox로 동작한다. */
  checkedValue?: unknown;
  /** checkbox가 uncheck될 때 쓸 값이다. 생략하면 false로 동작한다. */
  uncheckedValue?: unknown;
  /** DOM type을 명시해야 하는 radio/checkbox/custom control에서 사용한다. */
  type?: 'checkbox' | 'radio' | 'select' | 'textarea' | 'custom' | (string & {});
};

type BindingHandlers<TElement extends HTMLElement> = {
  onChange: ChangeEventHandler<TElement>;
  onBlur: FocusEventHandler<TElement>;
  onFocus: FocusEventHandler<TElement>;
};

/** `<input {...useRegister(...)}/>`에 바로 spread할 수 있는 binding props다. */
export type InputRegisterProps = BindingHandlers<HTMLInputElement> & {
  name: string;
  value?: InputValue;
  checked?: boolean;
};

/** `<select {...useRegister({ type: 'select', ... })}/>`에 바로 spread할 수 있는 binding props다. */
export type SelectRegisterProps = BindingHandlers<HTMLSelectElement> & {
  name: string;
  value?: SelectValue;
};

/** `<textarea {...useRegister({ type: 'textarea', ... })}/>`에 바로 spread할 수 있는 binding props다. */
export type TextareaRegisterProps = BindingHandlers<HTMLTextAreaElement> & {
  name: string;
  value?: TextareaValue;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type CustomRegisterProps = BindingHandlers<HTMLElement> & {
  name: string;
  value?: unknown;
  checked?: boolean;
};

/** DOM-event-compatible field binding props다. */
export type RegisterProps = InputRegisterProps | SelectRegisterProps | TextareaRegisterProps | CustomRegisterProps;

/** register options의 control kind에 맞춘 binding props다. */
export type RegisterPropsFor<TOptions extends RegisterOptions> = TOptions extends { type: 'select' }
  ? SelectRegisterProps
  : TOptions extends { type: 'textarea' }
    ? TextareaRegisterProps
    : TOptions extends { type: 'custom' }
      ? CustomRegisterProps
      : InputRegisterProps;

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type UseFieldReturn<TProps extends RegisterProps = RegisterProps> = {
  props: TProps;
  value: unknown;
  setValue: (value: unknown) => void;
  errors: FormError[];
  dirty: boolean;
  touched: boolean;
};

/** form 전체 상태에서 React UI가 자주 쓰는 aggregate state다. */
export type UseFormStateReturn<TValues> = {
  state: Readonly<FormState<TValues>>;
  errors: Record<string, FormError[]>;
  dirtyFields: Record<string, true>;
  touchedFields: Record<string, true>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

export type RegisterPropsList<TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? RegisterPropsFor<TOptions[Index]> : never;
};

/** `useForm(form)`이 반환하는 form-bound hook 모음이다. */
export type ReactForm<TValues> = {
  form: Form<TValues>;
  useRegister<TOptions extends RegisterOptions>(options: TOptions): RegisterPropsFor<TOptions>;
  useRegister<TOptions extends readonly RegisterOptions[]>(options: TOptions): RegisterPropsList<TOptions>;
  useRegister<TOptions extends readonly RegisterOptions[]>(...options: TOptions): RegisterPropsList<TOptions>;
  useField<TOptions extends RegisterOptions>(options: TOptions): UseFieldReturn<RegisterPropsFor<TOptions>>;
  useFormState(): UseFormStateReturn<TValues>;
};
