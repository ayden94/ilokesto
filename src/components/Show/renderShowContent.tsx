import { processShowable } from "./processShowable";

/**
 * children 렌더링을 처리하는 공통 함수
 */
export function renderShowContent(
  when: any,
  children: React.ReactNode | ((value: any) => React.ReactNode),
  fallback: React.ReactNode
): React.ReactNode {
  // children이 함수인 경우 (기존 방식)
  if (typeof children === "function") {
    const shouldRender = Array.isArray(when) ? when.every(Boolean) : !!when;
    return shouldRender ? children(when as any) : fallback;
  }

  // children이 ReactNode인 경우 (Showable 패턴)
  return processShowable(children, when, fallback);
}