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

export const Show: ShowType = createProxy(BaseShow, renderForTag, "show");