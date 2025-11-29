import { processShowable } from "./processShowable";
/**
 * children 렌더링을 처리하는 공통 함수
 *
 * 두 가지 사용 패턴:
 * 1. 함수 children: Show 자체가 조건부 렌더링 (<Show when={x}>{(val) => ...}</Show>)
 * 2. ReactNode children: Show는 항상 렌더링, Showable만 조건부 (<Show.div when={x}><Showable>...</Showable></Show.div>)
 */
export function renderShowContent(when, children, fallback) {
    // children이 함수인 경우 (기존 방식 - Show 자체가 조건부 렌더링)
    if (typeof children === "function") {
        const shouldRender = Array.isArray(when) ? when.every(Boolean) : !!when;
        return shouldRender ? children(when) : fallback;
    }
    // children이 ReactNode인 경우 (Showable 패턴 - Show는 항상 렌더링, Showable만 조건부)
    return processShowable(children, when, fallback);
}
