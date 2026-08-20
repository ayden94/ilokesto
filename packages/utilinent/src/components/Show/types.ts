import type { BaseTypeHelperFn, Fallback, NonNullableElements, ProxyType } from "../../types";

/**
 * Props for {@link Show} when `when` is an array.
 *
 * Renders children when the array is non-empty and every element is truthy.
 * The render-prop callback receives a tuple with all `NonNullable` elements.
 */
export interface ShowPropsArray<T extends unknown[]> extends Fallback {
  when: T;
  children: React.ReactNode | ((item: NonNullableElements<T>) => React.ReactNode);
}

/**
 * Props for {@link Show}.
 *
 * `when` — condition value; children render when truthy.
 * `children` — ReactNode or a render-prop that receives the narrowed `NonNullable<T>` value.
 * `fallback` — rendered when `when` is falsy (defaults to `null`).
 */
export interface ShowProps<T = unknown> extends Fallback {
  when: T;
  children: React.ReactNode | ((item: NonNullable<T>) => React.ReactNode);
}

export type BaseShowType<X = object> = {
  <const T extends Array<unknown>>(props: X & ShowPropsArray<T>): React.ReactNode;
  <const T extends unknown>(props: X & ShowProps<T>): React.ReactNode;
}

interface BaseShowTypeFn extends BaseTypeHelperFn {
  type: BaseShowType<this["props"]>;
}

export type ShowType = ProxyType<BaseShowTypeFn, "show">;