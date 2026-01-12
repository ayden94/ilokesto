import { ComponentPropsWithRef, createElement, forwardRef } from "react";
import { createProxy } from "../../core/createProxy";
import { resolveWhen } from "../../utils/resolveWhen";
import type { ShowProps, ShowPropsArray, ShowType } from "./types";

const BaseShow = <T,>({ when, children, fallback = null }: ShowProps<T> | ShowPropsArray<T[]>) => {
  const shouldRender = resolveWhen(when);

  return shouldRender
    ? typeof children === "function"
      ? children(when as any)
      : children
    : fallback;
};

const renderForTag =
  (tag: any) =>
  forwardRef(function Render(
    { when, children, fallback = null, ...props }: (ShowProps<any> | ShowPropsArray<any[]>) & ComponentPropsWithRef<any>,
    ref: any
  ) {
    const content = BaseShow({ when, children, fallback });
    return createElement(tag, { ...props, ref }, content);
  });

export const Show: ShowType = createProxy(BaseShow, renderForTag, "show");
