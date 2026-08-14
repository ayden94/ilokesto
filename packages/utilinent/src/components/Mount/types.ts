import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

export interface MountProps extends Fallback {
  children: React.ReactNode | (() => React.ReactNode | Promise<React.ReactNode>);
  onError?: (error: unknown) => void;
}

type BaseMountType<X = object> = {
  (props: X & MountProps): React.ReactNode;
}

interface BaseMountTypeFn extends BaseTypeHelperFn {
  type: BaseMountType<this["props"]>;
}

export type MountType = ProxyType<BaseMountTypeFn, "mount">;