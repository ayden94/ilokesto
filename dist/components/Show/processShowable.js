import { Children, isValidElement } from "react";
import { Showable } from ".";
/**
 * Showable 컴포넌트인지 확인하는 헬퍼 함수
 */
function isShowable(child) {
    return isValidElement(child) && child.type === Showable;
}
/**
 * Showable 패턴을 처리하는 공통 함수
 */
export function processShowable(children, when, fallback) {
    const childrenArray = Children.toArray(children);
    const shouldRender = Array.isArray(when) ? when.every(Boolean) : !!when;
    return childrenArray.map((child) => {
        if (isShowable(child)) {
            const showableChildren = child.props.children;
            const showableFallback = child.props.fallback ?? fallback;
            if (typeof showableChildren === "function") {
                return shouldRender ? showableChildren(when) : showableFallback;
            }
        }
        return child;
    });
}
