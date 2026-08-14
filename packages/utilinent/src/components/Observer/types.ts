import { Fallback } from "../../types";

export interface ObserverProps extends Fallback {
  children?: React.ReactNode | ((isIntersecting: boolean) => React.ReactNode);
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  onIntersect?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}
