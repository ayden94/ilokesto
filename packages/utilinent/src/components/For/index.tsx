import { ComponentPropsWithRef, createElement, forwardRef } from "react";
import { createProxy } from "../../core/createProxy";
import type { ForProps, ForType } from "./types";

function BaseFor<T extends Array<unknown>>({
  each,
  children,
  fallback = null,
}: ForProps<T>) {
  return each && each.length > 0 ? each.map(children) : fallback;
}

const renderForTag =
  (tag: any) =>
  // forward ref so consumers can attach a ref to the underlying DOM element
  forwardRef(<T extends Array<unknown>>(
    { each, children, fallback = null, ...props }: ForProps<T> & ComponentPropsWithRef<any>,
    ref: any
  ) => {
    const content = BaseFor({ each, children, fallback });
    return createElement(tag, { ...props, ref }, content);
  });

export const For: ForType = createProxy(BaseFor, renderForTag, "for");
