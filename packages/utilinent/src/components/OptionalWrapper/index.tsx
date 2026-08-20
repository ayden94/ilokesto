import { Show } from "../Show";
import { OptionalWrapperProps } from "./types";

/**
 * Conditionally wraps children in a `wrapper` function when `when` is truthy.
 *
 * When `when` is falsy, renders children directly — or through `fallback` if provided.
 *
 * @example
 * ```tsx
 * <OptionalWrapper when={isModal} wrapper={(c) => <Modal>{c}</Modal>}>
 *   <Content />
 * </OptionalWrapper>
 * ```
 */
export function OptionalWrapper<T>({
  when,
  children,
  wrapper,
  fallback
}: OptionalWrapperProps<T>): React.ReactNode {
  return <Show when={when} fallback={fallback ? fallback(children) : children}>
    {wrapper(children)}
  </Show>;
}
