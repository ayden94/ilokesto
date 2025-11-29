import { ComponentPropsWithRef, createElement, forwardRef } from "react";
import { htmlTags } from "../../constants/htmlTags";
import type { ShowProps, ShowPropsArray, ShowType } from "../../types/show";
import { renderShowContent } from "./renderShowContent";

/**
 * Showable 컴포넌트는 실제로는 렌더링되지 않고,
 * Show 컴포넌트가 이를 찾아서 when 값을 전달하고 조건부 렌더링 처리
 * Forrable과 동일한 패턴
 */
export const Showable = ({ 
  children,
  fallback = null 
}: { 
  children: React.ReactNode | ((value: any) => React.ReactNode);
  fallback?: React.ReactNode;
}) => {
  return <>{children}</>;
};

const BaseShow = <T,>({ when, children, fallback = null }: ShowProps<T> | ShowPropsArray<T[]>) => {
  return <>{renderShowContent(when, children, fallback)}</>;
};

const renderForTag =
  (tag: any) =>
  // forward ref so consumers like Observer can pass a ref to the real DOM element
  forwardRef(function Render(
    { when, children, fallback = null, ...props }: (ShowProps<any> | ShowPropsArray<any[]>) & ComponentPropsWithRef<any>,
    ref: any
  ) {
    return createElement(tag, { ...props, ref }, renderShowContent(when, children, fallback));
  });

const tagEntries = htmlTags.reduce((acc, tag) => {
  (acc as any)[tag] = renderForTag(tag);
  return acc;
}, {} as any);

export const Show = Object.assign(BaseShow, tagEntries) as unknown as ShowType;
