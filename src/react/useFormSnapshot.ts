import { useSyncExternalStore } from 'react';
import type { Form, FormState } from '../core/index';

/** React 18+ 외부 store 구독 API로 core form snapshot을 구독한다. */
export function useFormSnapshot<TValues>(form: Form<TValues>): Readonly<FormState<TValues>> {
  return useSyncExternalStore(
    listener => form.subscribe(listener),
    () => form.getState(),
    () => form.getState(),
  );
}
