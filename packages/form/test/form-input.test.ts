import { expect, test } from 'vitest';

import { createFormFromOptions } from '../src/adapters/FormInput';
import type { ResetOptions } from '../src/index';

test('Given adapter-only option getters, when a core form is created, then those options are not read or forwarded', () => {
  type Values = { readonly email: string };
  const options = {
    defaultValues: { email: '' },
    get resetOptions(): ResetOptions {
      throw new TypeError('resetOptions crossed the adapter boundary');
    },
    get values(): Values {
      throw new TypeError('values crossed the adapter boundary');
    },
  };

  const form = createFormFromOptions(options);

  expect(form.getValues()).toEqual({ email: '' });
});
