import { createProxy } from "../../core/createProxy";
import { createTagRenderer } from "../../core/createTagRenderer";
import { resolveWhen } from "../../utils/resolveWhen";
import type { ShowProps, ShowPropsArray, ShowType } from "./types";

const BaseShow = <T,>({
  when,
  children,
  fallback = null,
}: ShowProps<T> | ShowPropsArray<T[]>) => {
  const shouldRender = resolveWhen(when);

  return shouldRender
    ? typeof children === "function"
      ? children(when as any)
      : children
    : fallback;
};

const renderForTag = createTagRenderer(
  BaseShow as (props: any) => React.ReactNode,
  ["when", "children", "fallback"],
  { fallback: null },
);

/**
 * Conditionally renders children when `when` is truthy.
 *
 * Supports a render-prop callback that receives the narrowed `NonNullable` value.
 * Polymorphic: access typed HTML tag variants via `Show.div`, `Show.span`, etc.,
 * and plugin-registered components via `Show.Link`, `Show.motionDiv`, etc.
 *
 * @example
 * ```tsx
 * <Show when={user}>{(u) => <h1>Hello {u.name}</h1>}</Show>
 * <Show.div when={count > 0}>{count} items</Show.div>
 * ```
 */
export const Show: ShowType = createProxy(BaseShow, renderForTag, "show");