import { CreateForm, type CreateFormOptions, type Form } from '../core/index';

export type FormInput<TValues> = Form<TValues> | CreateFormOptions<TValues>;

export function isFormInstance<TValues>(input: FormInput<TValues>): input is Form<TValues> {
  return 'subscribe' in input && 'submit' in input;
}

export function createFormFromOptions<TValues>(options: CreateFormOptions<TValues>): Form<TValues> {
  return new CreateForm(options);
}
