import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

export interface ForProps<T extends Array<unknown>> extends Fallback {
  each: T | null | undefined; // 배열 또는 null/undefined 허용
  children: (item: T[number], index: number) => React.ReactNode;
};

type BaseForType<X = object> = {
  <const T extends Array<unknown>>(props: X & ForProps<T>): React.ReactNode;
}

interface BaseForTypeFn extends BaseTypeHelperFn {
  type: BaseForType<this["props"]>;
}

export type ForType = ProxyType<BaseForTypeFn, "for">;