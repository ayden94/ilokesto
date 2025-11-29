import { Children, isValidElement } from "react";
import { Forrable } from ".";

/**
 * Forrable 컴포넌트인지 확인하는 헬퍼 함수
 */
function isForrable(child: React.ReactNode): child is React.ReactElement {
  return isValidElement(child) && child.type === Forrable;
}

/**
 * Forrable 패턴을 처리하는 공통 함수
 */
export function processForrable<T extends Array<unknown>>(
  children: React.ReactNode,
  each: T | null | undefined,
  fallback: React.ReactNode
) {
  const childrenArray = Children.toArray(children);
  const forrable = childrenArray.find(isForrable);
  
  if (forrable) {
    const forrableChildren = (forrable.props as any).children;
    
    if (typeof forrableChildren === "function") {
      const content = each && each.length > 0 ? each.map(forrableChildren) : fallback;
      
      return childrenArray.map((child) => {
        if (child === forrable) {
          return content;
        }
        return child;
      }) as React.ReactNode;
    }
  }
  
  return children;
}
