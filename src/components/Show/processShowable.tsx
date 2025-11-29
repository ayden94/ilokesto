import { Children, isValidElement } from "react";
import { Showable } from ".";

/**
 * Showable 컴포넌트인지 확인하는 헬퍼 함수
 */
function isShowable(child: React.ReactNode): child is React.ReactElement {
  return isValidElement(child) && child.type === Showable;
}

/**
 * Showable 패턴을 처리하는 공통 함수
 */
export function processShowable(
  children: React.ReactNode,
  when: any,
  fallback: React.ReactNode
) {
  const childrenArray = Children.toArray(children);
  const shouldRender = Array.isArray(when) ? when.every(Boolean) : !!when;
  
  return childrenArray.map((child) => {
    if (isShowable(child)) {
      const showableChildren = (child.props as any).children;
      const showableFallback = (child.props as any).fallback ?? fallback;
      
      if (typeof showableChildren === "function") {
        return shouldRender ? showableChildren(when) : showableFallback;
      }
    }
    return child;
  }) as React.ReactNode;
}