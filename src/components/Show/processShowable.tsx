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
 * 
 * Forrable과 동일한 패턴:
 * - Showable을 찾아서 when 값을 기반으로 조건부 렌더링
 * - 다른 children은 그대로 유지
 * - Showable 위치에 렌더링 결과 삽입
 */
export function processShowable(
  children: React.ReactNode,
  when: any,
  fallback: React.ReactNode
) {
  const childrenArray = Children.toArray(children);
  const showable = childrenArray.find(isShowable);
  const shouldRender = Array.isArray(when) ? when.every(Boolean) : !!when;
  
  // Showable이 없으면 children 그대로 반환 (일반 children들)
  if (!showable) {
    return children;
  }
  
  // Showable을 찾아서 조건부 렌더링 처리
  const showableChildren = (showable.props as any).children;
  const showableFallback = (showable.props as any).fallback ?? fallback;
  
  // when 조건에 따라 Showable의 content 결정
  let showableContent: React.ReactNode;
  
  if (typeof showableChildren === "function") {
    // 함수인 경우: when 값을 전달하고 조건부 렌더링
    showableContent = shouldRender ? showableChildren(when) : showableFallback;
  } else {
    // ReactNode인 경우: 조건부 렌더링
    showableContent = shouldRender ? showableChildren : showableFallback;
  }
  
  // children 배열에서 Showable만 교체
  return childrenArray.map((child) => {
    if (child === showable) {
      return showableContent;
    }
    return child;
  }) as React.ReactNode;
}