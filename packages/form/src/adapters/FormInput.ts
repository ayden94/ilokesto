import { CreateForm, type CreateFormOptions, type Form, type ResetOptions } from '../core/index';

export type ReactiveFormOptions<TValues, TSource> = CreateFormOptions<TValues> & {
  readonly values?: TSource;
  readonly resetOptions?: ResetOptions;
};

export type FormInput<TValues, TOptions extends CreateFormOptions<TValues>> = Form<TValues> | TOptions;

export function isFormInstance<TValues>(
  input: Form<TValues> | CreateFormOptions<TValues>,
): input is Form<TValues> {
  return 'subscribe' in input && 'submit' in input;
}

export function createFormFromOptions<TValues>(options: CreateFormOptions<TValues>): Form<TValues> {
  const { defaultValues, schema, schemaOptions, validateOn } = options;
  return new CreateForm({ defaultValues, schema, schemaOptions, validateOn });
}

export function createExternalValuesSynchronizer<TValues>(
  form: Form<TValues>,
): (values: TValues | undefined, resetOptions: ResetOptions | undefined) => void {
  let previousDefinedValues: TValues | undefined;

  return (values, resetOptions) => {
    if (values === undefined || Object.is(previousDefinedValues, values)) {
      return;
    }

    previousDefinedValues = values;
    form.reset(values, resetOptions);
  };
}
