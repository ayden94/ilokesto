import { getCurrentScope, onScopeDispose } from 'vue';
import type { Form } from '../core/index';
import type { RegisterOptions } from './types';

/** field-local schema를 현재 effect scope lifecycle에 맞춰 등록한다. */
export function useFieldSchemaRegistrations<TValues>(form: Form<TValues>, options: readonly RegisterOptions[]): void {
  const cleanups = options.flatMap(option => {
    if (!option.schema) {
      return [];
    }

    return [form.registerFieldSchema(option.name, { schema: option.schema, schemaOptions: option.schemaOptions })];
  });

  if (cleanups.length === 0) {
    return;
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cleanups.forEach(cleanup => cleanup());
    });
  }
}
