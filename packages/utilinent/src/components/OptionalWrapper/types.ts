/**
 * Props for {@link OptionalWrapper}.
 *
 * `when` — condition value; when truthy, `wrapper` is applied to children.
 * `children` — the content to potentially wrap.
 * `wrapper` — function that wraps children when `when` is truthy.
 * `elseWrapper` — function that transforms children when `when` is falsy;
 *   if omitted, children are rendered as-is.
 * `fallback` — @deprecated alias for `elseWrapper`.
 */
export interface OptionalWrapperProps<T = unknown> {
  when: T;
  children: React.ReactNode;
  wrapper: (children: React.ReactNode) => React.ReactNode;
  elseWrapper?: (children: React.ReactNode) => React.ReactNode;
  /** @deprecated Use `elseWrapper` instead. */
  fallback?: (children: React.ReactNode) => React.ReactNode;
}