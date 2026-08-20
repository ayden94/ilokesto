import type { BaseTypeHelperFn, Fallback, ProxyType } from "../../types";

type MountNode<Node = React.ReactNode> = Node extends PromiseLike<unknown> ? never : Node;

/**
 * Props for {@link Mount}.
 *
 * `children` — a ReactNode or a factory function returning `ReactNode | Promise<ReactNode>`.
 *   Direct Promise children are rejected at the type level; use a factory instead.
 * `fallback` — rendered while a factory is pending or on error (defaults to `null`).
 * `onError` — called when the factory throws or the returned promise rejects.
 */
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
