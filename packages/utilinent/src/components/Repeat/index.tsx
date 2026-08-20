import { createProxy } from "../../core/createProxy";
import { createTagRenderer } from "../../core/createTagRenderer";
import type { RepeatProps, RepeatType } from "./types";

function BaseRepeat({ times, children, fallback = null }: RepeatProps) {
  const content =
    times && times > 0 && Number.isInteger(times)
      ? Array.from({ length: times }, (_, i) => children(i))
      : fallback ?? null;

  return <>{content}</>;
}

const renderForTag = createTagRenderer(
  BaseRepeat as (props: any) => React.ReactNode,
  ["times", "children", "fallback"],
  { fallback: null },
);

/**
 * Renders `children` `times` times, passing the 0-based index to each call.
 *
 * Renders `fallback` when `times` is zero, negative, or non-integer.
 * Polymorphic: access typed HTML tag variants via `Repeat.div`, etc.
 *
 * @example
 * ```tsx
 * <Repeat.div times={5}>{(i) => <span key={i}>Dot {i}</span>}</Repeat.div>
 * ```
 */
export const Repeat: RepeatType = createProxy(BaseRepeat, renderForTag, "repeat");