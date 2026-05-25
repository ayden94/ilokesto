import { useEffect } from 'react';
import type { Form } from '../core/index';
import type { RegisterOptions } from './types';
import { fieldPathToDomName } from './RegisterBinding';

/** field-local schema 하나를 effect lifecycle에 맞춰 등록한다. */
export function useFieldSchemaRegistration<TValues>(form: Form<TValues>, options: RegisterOptions): void {
  const { name, schema, schemaOptions } = options;

  useEffect(() => {
    if (!schema) {
      return undefined;
    }

    return form.registerFieldSchema(name, { schema, schemaOptions });
  }, [form, name, schema, schemaOptions]);
}

/** bulk register에서도 hook 호출 수가 옵션 길이에 의존하지 않도록 한 effect에서 모두 등록한다. */
export function useFieldSchemaRegistrations<TValues>(form: Form<TValues>, options: readonly RegisterOptions[]): void {
  const schemaSignature = options.map(option => `${fieldPathToDomName(option.name)}:${option.schema ? 'schema' : 'none'}`).join('|');

  useEffect(() => {
    const cleanups = options.flatMap(option => {
      if (!option.schema) {
        return [];
      }

      return [form.registerFieldSchema(option.name, { schema: option.schema, schemaOptions: option.schemaOptions })];
    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [form, options, schemaSignature]);
}
