import type { FieldPathInput, Form, FormError, FormState, StandardSchemaV1 } from '../core/index';

type DomValue = string | number | readonly string[];

/** Vue adapter가 field composable에서 공통으로 받는 옵션이다. */
export type FieldHookOptions = {
  /** core form field path다. string은 하나의 field 이름으로 취급하고, tuple은 nested path를 표현한다. */
  name: FieldPathInput;
  /** 이 field에만 적용할 schema다. form-level schema보다 우선한다. */
  schema?: StandardSchemaV1<unknown, unknown>;
  /** field-local schema validate 함수에 넘길 옵션이다. */
  schemaOptions?: StandardSchemaV1.Options;
};

/** DOM binding 보정 옵션이다. `type`은 input type으로만 쓰며 기본값은 `text`다. */
export type RegisterOptions = FieldHookOptions & {
  /** input type이다. checkbox/radio는 checked 처리에 사용하고, 생략 시 text로 반환한다. */
  type?: string;
  /** radio/checkbox처럼 DOM value와 form value를 구분해야 할 때 사용한다. */
  value?: unknown;
  /** checkbox가 check될 때 쓸 값이다. 생략하면 boolean checkbox로 동작한다. */
  checkedValue?: unknown;
  /** checkbox가 uncheck될 때 쓸 값이다. 생략하면 false로 동작한다. */
  uncheckedValue?: unknown;
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
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly isSubmitting: boolean;
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
};
