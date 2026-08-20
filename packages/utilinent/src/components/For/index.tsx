import { createProxy } from "../../core/createProxy";
import { createTagRenderer } from "../../core/createTagRenderer";
import type { ForProps, ForType } from "./types";

function BaseFor<T extends Array<unknown>>({
  each,
  children,
  fallback = null,
}: ForProps<T>) {
  return each && each.length > 0 ? each.map(children) : fallback;
}

const renderForTag = createTagRenderer(
  BaseFor as (props: any) => React.ReactNode,
  ["each", "children", "fallback"],
  { fallback: null },
);

/**
 * Renders a list by mapping `children` over each item in `each`.
 *
 * Renders `fallback` when the array is empty or nullish.
 * Polymorphic: access typed HTML tag variants via `For.ul`, `For.div`, etc.
 *
 * @example
 * ```tsx
 * <For.ul each={items}>{(item, i) => <li key={i}>{item}</li>}</For.ul>
 * ```
 */
export const For: ForType = createProxy(BaseFor, renderForTag, "for");