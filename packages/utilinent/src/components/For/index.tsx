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

export const For: ForType = createProxy(BaseFor, renderForTag, "for");