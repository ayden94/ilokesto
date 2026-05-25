import { createSignal, onCleanup, type Accessor } from 'solid-js';
import type { Form, FormState } from '../core/index';

/** core form snapshot을 Solid signal로 연결한다. */
export function useFormSnapshot<TValues>(form: Form<TValues>): Accessor<Readonly<FormState<TValues>>> {
  const [snapshot, setSnapshot] = createSignal<Readonly<FormState<TValues>>>(form.getState(), { equals: false });
  const unsubscribe = form.subscribe(() => {
    setSnapshot(form.getState());
  });

  onCleanup(unsubscribe);

  return snapshot;
}
