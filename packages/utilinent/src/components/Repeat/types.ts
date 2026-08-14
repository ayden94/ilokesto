import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

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