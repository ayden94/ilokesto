import type { Fallback } from "../../types";

/**
 * Props for {@link Media}.
 *
 * `query` — a CSS media query string.
 * `children` — ReactNode rendered when the query matches, or a render-prop
 *   receiving the `matches` boolean.
 * `fallback` — rendered when the query does not match and `children` is not a
 *   render-prop (defaults to `null`).
 */
export interface MediaProps extends Fallback {
  query: string;
  children?: React.ReactNode | ((matches: boolean) => React.ReactNode);
}