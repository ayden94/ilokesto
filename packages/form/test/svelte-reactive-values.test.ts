// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import type { Readable, Subscriber, Unsubscriber } from 'svelte/store';
import { expect, test } from 'vitest';

import type { Form } from '../src/index';
import { useForm } from '../src/svelte/index';
import SvelteReactiveValuesConsumer from './fixtures/SvelteReactiveValuesConsumer.svelte';

type Values = {
  readonly email: string;
  readonly name: string;
};

function createManualReadable<TValue>(initialValue: TValue): {
  readonly emit: (value: TValue) => void;
  readonly readable: Readable<TValue>;
  readonly subscriberCount: () => number;
} {
  const subscribers = new Set<Subscriber<TValue>>();
  return {
    emit(value) {
      for (const subscriber of subscribers) subscriber(value);
    },
    readable: {
      subscribe(run: Subscriber<TValue>): Unsubscriber {
        subscribers.add(run);
        run(initialValue);
        return () => {
          subscribers.delete(run);
        };
      },
    },
    subscriberCount: () => subscribers.size,
  };
}

test('Given a Svelte values readable, when references change, then resets and unmount cleanup follow the contract', async () => {
  const first = { email: 'first@example.com', name: 'First' };
  const second = { email: 'second@example.com', name: 'Second' };
  const source = createManualReadable<Values | undefined>(first);
  const target = document.createElement('div');
  let form: Form<Values> | undefined;
  const component = mount(SvelteReactiveValuesConsumer, {
    props: {
      onForm(nextForm) {
        form = nextForm;
      },
      resetOptions: { keepDirtyValues: true },
      values: source.readable,
    },
    target,
  });
  flushSync();

  if (form === undefined) throw new TypeError('Svelte form was not created');
  expect(form.getValues()).toEqual(first);
  expect(source.subscriberCount()).toBe(1);

  form.setValue('email', 'user@example.com', { source: 'user' });
  form.setErrors('name', [{ message: 'Keep until a value-driven reset' }]);

  source.emit(undefined);
  source.emit(first);
  expect(form.getValue('email')).toBe('user@example.com');
  expect(form.getFieldState('name').errors).toHaveLength(1);

  source.emit(second);
  expect(form.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
  expect(form.getFieldState('name').errors).toEqual([]);

  await unmount(component);
  expect(source.subscriberCount()).toBe(0);
  source.emit({ email: 'after-unmount@example.com', name: 'After unmount' });
  expect(form.getValues()).toEqual({ email: 'user@example.com', name: 'Second' });
});

test('Given reactive Svelte options outside component initialization, when useForm fails, then it never subscribes', () => {
  const source = createManualReadable<Values | undefined>({
    email: 'first@example.com',
    name: 'First',
  });

  expect(() => useForm({
    defaultValues: { email: '', name: '' },
    values: source.readable,
  })).toThrow();
  expect(source.subscriberCount()).toBe(0);
});
