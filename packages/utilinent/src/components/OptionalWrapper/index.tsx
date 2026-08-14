import { Show } from "../Show";
import { OptionalWrapperProps } from "./types";

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
