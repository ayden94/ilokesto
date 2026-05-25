import { getCurrentScope, onScopeDispose, shallowRef, type ShallowRef } from 'vue';
import type { Form, FormState } from '../core/index';

/** core form snapshot을 Vue shallowRef로 연결한다. */
export function useFormSnapshot<TValues>(form: Form<TValues>): ShallowRef<Readonly<FormState<TValues>>> {
  const snapshot = shallowRef(form.getState()) as ShallowRef<Readonly<FormState<TValues>>>;
  const unsubscribe = form.subscribe(() => {
    snapshot.value = form.getState();
  });

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe);
  }

  return snapshot;
}
