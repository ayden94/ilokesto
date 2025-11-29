import { ComponentPropsWithRef } from "react";
import { Fallback, HtmlTagHelpers } from ".";

/**
 * Repeat 컴포넌트의 props 타입
 * times만큼 children을 반복 렌더링
 */
export interface RepeatProps extends Fallback {
  times: number; 
  children: (index: number) => React.ReactNode; 
}

/**
 * 특정 HTML 태그를 위한 Repeat 헬퍼 타입
 */
type RepeatTagHelper<K extends keyof JSX.IntrinsicElements> = {
  (props: RepeatProps & Omit<ComponentPropsWithRef<K>, "children">): React.ReactNode;
};

/**
 * Repeat 컴포넌트의 전체 타입
 * 기본 사용과 HTML 태그별 헬퍼를 모두 포함
 */
export interface RepeatType extends HtmlTagHelpers<RepeatTagHelper<any>> {
  (props: RepeatProps): React.ReactNode;
}
