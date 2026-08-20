import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

/**
 * Props for {@link For}.
 *
 * `each` — array to iterate over; `null`/`undefined` renders `fallback`.
 * `children` — render function receiving each item and its index.
 * `fallback` — rendered when `each` is empty or nullish (defaults to `null`).
 */
export interface ForProps<T extends Array<unknown>> extends Fallback {
  each: T | null | undefined;
  children: (item: T[number], index: number) => React.ReactNode;
};

type BaseForType<X = object> = {
  <const T extends Array<unknown>>(props: X & ForProps<T>): React.ReactNode;
}

interface BaseForTypeFn extends BaseTypeHelperFn {
  type: BaseForType<this["props"]>;
}

export type ForType = ProxyType<BaseForTypeFn, "for">;