import { Children, isValidElement } from "react";
import { Forrable } from ".";
/**
 * Forrable 컴포넌트인지 확인하는 헬퍼 함수
 */
function isForrable(child) {
    return isValidElement(child) && child.type === Forrable;
}
/**
 * Forrable 패턴을 처리하는 공통 함수
 */
export function processForrable(children, each, fallback) {
    const childrenArray = Children.toArray(children);
    const forrable = childrenArray.find(isForrable);
    if (forrable) {
        const forrableChildren = forrable.props.children;
        if (typeof forrableChildren === "function") {
            const content = each && each.length > 0 ? each.map(forrableChildren) : fallback;
            return childrenArray.map((child) => {
                if (child === forrable) {
                    return content;
                }
                return child;
            });
        }
    }
    return children;
}
