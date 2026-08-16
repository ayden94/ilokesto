import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

type MountNode<Node = React.ReactNode> = Node extends PromiseLike<unknown> ? never : Node;

export interface MountProps extends Fallback {
  children: MountNode | (() => React.ReactNode | Promise<React.ReactNode>);
  onError?: (error: unknown) => void;
}

type BaseMountType<X = object> = {
  (props: X & MountProps): React.ReactNode;
}

interface BaseMountTypeFn extends BaseTypeHelperFn {
  type: BaseMountType<this["props"]>;
}

export type MountType = ProxyType<BaseMountTypeFn, "mount">;
