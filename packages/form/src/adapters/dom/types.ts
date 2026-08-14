import type { FieldPathInput, StandardSchemaV1 } from '../../core/index';

/** Framework adapters가 field binding에서 공통으로 받는 옵션이다. */
export type FieldHookOptions = {
  /** core form field path다. string은 하나의 field 이름으로 취급하고, tuple은 nested path를 표현한다. */
  name: FieldPathInput;
  /** 이 field에만 적용할 schema다. form-level schema보다 우선한다. */
  schema?: StandardSchemaV1<unknown, unknown>;
  /** field-local schema validate 함수에 넘길 옵션이다. */
  schemaOptions?: StandardSchemaV1.Options;
};

/** DOM binding 보정 옵션이다. `type`은 input type으로만 쓰며 기본값은 `text`다. */
export type RegisterOptions = FieldHookOptions & {
  /** input type이다. checkbox/radio는 checked 처리에 사용하고, 생략 시 text로 반환한다. */
  type?: string;
  /** radio/checkbox처럼 DOM value와 form value를 구분해야 할 때 사용한다. */
  value?: unknown;
  /** checkbox가 check될 때 쓸 값이다. 생략하면 boolean checkbox로 동작한다. */
  checkedValue?: unknown;
  /** checkbox가 uncheck될 때 쓸 값이다. 생략하면 false로 동작한다. */
  uncheckedValue?: unknown;
};

export type FieldEventTarget = HTMLElement & {
  type?: string;
  value?: unknown;
  checked?: boolean;
  multiple?: boolean;
  selectedOptions?: Iterable<{ value: string }>;
};

export type DomValue = string | number | readonly string[];
