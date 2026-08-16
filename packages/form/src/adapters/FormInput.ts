import { CreateForm, type CreateFormOptions, type Form, type ResetOptions } from '../core/index';

export type ReactiveFormOptions<TValues> = CreateFormOptions<TValues> & {
  /** 외부 서버/query/props 값이 바뀔 때 adapter가 reset을 트리거하기 위한 값이다. */
  values?: TValues;
  /** adapter가 values 변경으로 reset을 호출할 때 적용할 보존 옵션이다. */
  resetOptions?: ResetOptions;
};

export type FormInput<TValues> = Form<TValues> | ReactiveFormOptions<TValues>;

export function isFormInstance<TValues>(
  input: Form<TValues> | CreateFormOptions<TValues>,
): input is Form<TValues> {
  return 'subscribe' in input && 'submit' in input;
}

export function createFormFromOptions<TValues>(options: ReactiveFormOptions<TValues>): Form<TValues> {
  const { values, resetOptions, ...createOptions } = options;

  void values;
  void resetOptions;

  return new CreateForm(createOptions);
}
