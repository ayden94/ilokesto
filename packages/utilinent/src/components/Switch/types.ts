import type { BaseTypeHelperFn, Fallback, NonNullableElements, ProxyType } from "../../types";

export interface MatchProps<T = unknown> {
  when: T;
  children: React.ReactNode | ((item: NonNullable<T>) => React.ReactNode);
}

export interface MatchPropsArray<T extends readonly unknown[]> {
  when: T;
  children: React.ReactNode | ((item: NonNullableElements<T>) => React.ReactNode);
}

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
