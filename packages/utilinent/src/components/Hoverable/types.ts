import type { Fallback } from "../../types";

/**
 * Props for {@link Hoverable}.
 *
 * `children` — ReactNode or a render-prop receiving the current `isHovering` boolean.
 */
export interface HoverableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">, Fallback {
  children?: React.ReactNode | ((isHovering: boolean) => React.ReactNode);
}