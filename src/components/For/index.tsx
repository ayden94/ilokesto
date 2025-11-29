import { ComponentPropsWithRef, createElement, forwardRef } from "react";
import { htmlTags } from "../../constants/htmlTags";
import type { ForProps, ForType } from "../../types/for";
import { processForrable } from "./processForrable";

export const Forrable = ({ children }: { children: React.ReactNode | ((...args: any[]) => React.ReactNode) }) => {
  return <>{children}</>;
};

function BaseFor<T extends Array<unknown>>({
  each,
  children,
  fallback = null,
}: ForProps<T>) {
  // children이 함수인 경우 (기존 방식)
  if (typeof children === "function") {
    const content = each && each.length > 0 ? each.map(children) : fallback;
    return <>{content}</>;
  }
  
  // children이 ReactNode인 경우 (Forrable 패턴)
  return <>{processForrable(children, each, fallback)}</>;
}

const renderForTag =
  (tag: any) =>
  // forward ref so consumers can attach a ref to the underlying DOM element
  forwardRef(<T extends Array<unknown>>(
    { each, children, fallback = null, ...props }: ForProps<T> & ComponentPropsWithRef<any>,
    ref: any
  ) => {
    // children이 함수인 경우 (기존 방식)
    if (typeof children === "function") {
      const content = each && each.length > 0 ? each.map(children) : fallback;
      return createElement(tag, { ...props, ref }, content);
    }
    
    // children이 ReactNode인 경우 (Forrable 패턴)
    return createElement(tag, { ...props, ref }, processForrable(children, each, fallback));
  });

const tagEntries = htmlTags.reduce((acc, tag) => {
  (acc as any)[tag] = renderForTag(tag);
  return acc;
}, {} as any);

export const For = Object.assign(BaseFor, tagEntries) as unknown as ForType;
