<script lang="ts">
  import { untrack } from 'svelte';
  import type { Readable } from 'svelte/store';

  import type { Form, ResetOptions } from '../../src/index';
  import { useForm } from '../../src/svelte/index';

  type Values = {
    readonly email: string;
    readonly name: string;
  };

  let { onForm, resetOptions, values }: {
    readonly onForm: (form: Form<Values>) => void;
    readonly resetOptions?: ResetOptions;
    readonly values: Readable<Values | undefined>;
  } = $props();

  const { form } = untrack(() => useForm({
      defaultValues: { email: '', name: '' },
      resetOptions,
      values,
    }));

  untrack(() => onForm(form));
</script>
