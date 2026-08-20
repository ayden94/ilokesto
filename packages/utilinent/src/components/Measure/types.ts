import type { Fallback } from "../../types";

/**
 * Props for {@link Measure}.
 *
 * `children` — ReactNode or a render-prop receiving the current `{ width, height }`.
 * `box` — `ResizeObserver` box model (default `content-box`).
 * `initialSize` — initial size before the first observation fires.
 */
export interface MeasureProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode | ((size: { width: number; height: number }) => React.ReactNode);
  box?: ResizeObserverBoxOptions;
  initialSize?: DOMRectReadOnly;
}