// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import { useForm } from '../src/svelte/index';
import SvelteFieldConsumer from './fixtures/SvelteFieldConsumer.svelte';

const readOutput = (target: HTMLElement, testId: string): string => {
  const output = target.querySelector(`[data-testid="${testId}"]`);
  if (output === null) throw new TypeError(`Missing output ${testId}`);
  return output.textContent ?? '';
};

test('Given a mounted Svelte consumer, when field state changes, then $field renders each latest snapshot', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  const field = useForm(form).useField({ name: 'email' });
  const target = document.createElement('div');
  const component = mount(SvelteFieldConsumer, { props: { field }, target });
  flushSync();

  expect(readOutput(target, 'value')).toBe('');
  expect(readOutput(target, 'dirty')).toBe('false');
  expect(readOutput(target, 'touched')).toBe('false');
  expect(readOutput(target, 'errors')).toBe('');

  const button = target.querySelector('button');
  if (button === null) throw new TypeError('Missing field update button');
  button.click();
  flushSync();
  expect(readOutput(target, 'value')).toBe('component@example.com');
  expect(readOutput(target, 'dirty')).toBe('true');

  form.setErrors('email', [{ message: 'Server error' }]);
  await form.blur('email');
  flushSync();
  expect(readOutput(target, 'errors')).toBe('Server error');
  expect(readOutput(target, 'touched')).toBe('true');

  await unmount(component);
  expect(target.childElementCount).toBe(0);
});
