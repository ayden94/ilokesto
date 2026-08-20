
/**
 * Props for {@link OptionalWrapper}.
 *
 * `when` — condition value; when truthy, `wrapper` is applied to children.
 * `children` — the content to potentially wrap.
 * `wrapper` — function that wraps children when `when` is truthy.
 * `fallback` — function that transforms children when `when` is falsy;
 *   if omitted, children are rendered as-is.
 */
export interface OptionalWrapperProps<T = unknown> {
  when: T;
  children: React.ReactNode;
  wrapper: (children: React.ReactNode) => React.ReactNode;
  fallback?: (children: React.ReactNode) => React.ReactNode;
}