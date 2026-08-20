import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

/**
 * Props for {@link Repeat}.
 *
 * `times` — how many times to invoke `children`; non-positive or non-integer values render `fallback`.
 * `children` — render function receiving the current index (0-based).
 * `fallback` — rendered when `times` is invalid (defaults to `null`).
 */
export interface RepeatProps extends Fallback {
  times: number;
  children: (index: number) => React.ReactNode;
}

type BaseRepeatType<X = object> = {
  (props: X & RepeatProps): React.ReactNode;
}

interface BaseRepeatTypeFn extends BaseTypeHelperFn {
  type: BaseRepeatType<this["props"]>;
}

export type RepeatType =  ProxyType<BaseRepeatTypeFn, "repeat">;