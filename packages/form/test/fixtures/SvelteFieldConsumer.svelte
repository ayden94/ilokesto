<script lang="ts">
  import type { SvelteFieldReturn } from '../../src/svelte/index';

  let { field }: { field: SvelteFieldReturn } = $props();
</script>

<output data-testid="value">{String($field.value)}</output>
<output data-testid="dirty">{String($field.dirty)}</output>
<output data-testid="touched">{String($field.touched)}</output>
<output data-testid="errors">{$field.errors.map((error) => error.message).join(',')}</output>
<button type="button" onclick={() => field.setValue('component@example.com')}>Set value</button>
