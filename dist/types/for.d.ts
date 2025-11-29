import { ComponentPropsWithRef } from "react";
import { Fallback, HtmlTagHelpers } from ".";
/**
 * For 컴포넌트의 props 타입
 * each가 null/undefined이거나 빈 배열이면 fallback 렌더링
 */
export interface ForProps<T extends Array<unknown>> extends Fallback {
    each: T | null | undefined;
    children: ((item: T[number], index: number) => React.ReactNode) | React.ReactNode;
}
/**
 * 특정 HTML 태그를 위한 For 헬퍼 타입
 */
type ForTagHelper<K extends keyof JSX.IntrinsicElements> = {
    <T extends Array<unknown>>(props: ForProps<T> & Omit<ComponentPropsWithRef<K>, 'children'>): React.ReactNode;
};
/**
 * For 컴포넌트의 전체 타입
 * 기본 사용과 HTML 태그별 헬퍼를 모두 포함
 */
export interface ForType extends HtmlTagHelpers<ForTagHelper<any>> {
    <T extends Array<unknown>>(props: ForProps<T>): React.ReactNode;
}
export {};
