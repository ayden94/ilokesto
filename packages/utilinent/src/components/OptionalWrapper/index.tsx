import { Show } from "../Show";
import type { OptionalWrapperProps } from "./types";

/**
 * Conditionally wraps children in a `wrapper` function when `when` is truthy.
 *
 * When `when` is falsy, renders children directly — or through `elseWrapper`
 * when provided. `fallback` is accepted as a deprecated alias for `elseWrapper`.
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
  elseWrapper,
  fallback,
}: OptionalWrapperProps<T>): React.ReactNode {
  const elseFn = elseWrapper ?? fallback;
  return (
    <Show when={when} fallback={elseFn ? elseFn(children) : children}>
      {wrapper(children)}
    </Show>
  );
}