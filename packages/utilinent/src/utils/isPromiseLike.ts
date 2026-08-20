/**
 * Type guard: narrows `value` to `PromiseLike<T>` when it has a `then` method.
 */
export function isPromiseLike<T = unknown>(
  value: unknown,
): value is PromiseLike<T> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}