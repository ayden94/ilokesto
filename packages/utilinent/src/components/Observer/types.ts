import { Fallback } from "../../types";

/**
 * Props for {@link Observer}.
 *
 * Wraps children in an IntersectionObserver-driven container.
 * `fallback` is shown until the element intersects the viewport.
 * A render-prop callback receives the current `isIntersecting` boolean.
 */
export interface ObserverProps extends Fallback {
  children?: React.ReactNode | ((isIntersecting: boolean) => React.ReactNode);
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  onIntersect?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}
