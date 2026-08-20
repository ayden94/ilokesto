import type { BaseTypeHelperFn, Fallback, NonNullableElements, ProxyType } from "../../types";

/**
 * Props for {@link Match}.
 *
 * `when` — condition value; children render when truthy.
 * `children` — ReactNode or a render-prop that receives the narrowed `NonNullable<T>` value.
 */
export interface MatchProps<T = unknown> {
  when: T;
  children: React.ReactNode | ((item: NonNullable<T>) => React.ReactNode);
}

/**
 * Props for {@link Match} when `when` is an array.
 *
 * The render-prop callback receives a tuple with all `NonNullable` elements.
 */
export interface MatchPropsArray<T extends readonly unknown[]> {
  when: T;
  children: React.ReactNode | ((item: NonNullableElements<T>) => React.ReactNode);
}

/**
 * Props for {@link Switch}.
 *
 * `children` — one or more {@link Match} elements; the first whose `when` is truthy is rendered.
 * `fallback` — rendered when no Match satisfies its condition (defaults to `null`).
 */
export interface SwitchProps extends Fallback {
  children: React.ReactNode;
}

type BaseSwitchType<X = object> = {
  (props: X & SwitchProps): React.ReactNode;
}

interface BaseSwitchTypeFn extends BaseTypeHelperFn {
  type: BaseSwitchType<this["props"]>;
}

export type SwitchType = ProxyType<BaseSwitchTypeFn, "switch">;
