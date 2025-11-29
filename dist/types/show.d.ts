import { ComponentPropsWithRef } from "react";
import { Fallback, HtmlTagHelpers, NonNullableElements } from "./";
/**
 * Show 컴포넌트의 배열 props 타입
 * when이 배열인 경우 모든 요소가 truthy여야 렌더링
 */
export interface ShowPropsArray<T extends unknown[]> extends Fallback {
    when: T;
    children: React.ReactNode | ((item: NonNullableElements<T>) => React.ReactNode);
}
/**
 * Show 컴포넌트의 기본 props 타입
 * when이 truthy일 때 children 렌더링
 */
export interface ShowProps<T = unknown> extends Fallback {
    when: T;
    children: React.ReactNode | ((item: NonNullable<T>) => React.ReactNode);
}
/**
 * 특정 HTML 태그를 위한 Show 헬퍼 타입
 * 배열과 단일 값 모두 지원
 */
type ShowTagHelper<K extends keyof JSX.IntrinsicElements> = {
    <T extends unknown[]>(props: Omit<ComponentPropsWithRef<K>, "children"> & ShowPropsArray<T>): React.ReactNode;
    <T extends unknown>(props: Omit<ComponentPropsWithRef<K>, "children"> & ShowProps<T>): React.ReactNode;
};
/**
 * Show 컴포넌트의 전체 타입
 * 기본 사용과 HTML 태그별 헬퍼를 모두 포함
 */
export interface ShowType extends HtmlTagHelpers<ShowTagHelper<any>> {
    <T extends unknown[]>(props: ShowPropsArray<T>): React.ReactNode;
    <T extends unknown>(props: ShowProps<T>): React.ReactNode;
}
export {};
