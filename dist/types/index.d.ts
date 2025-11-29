import type { ReactElement } from "react";
import type { HtmlTag } from "../constants/htmlTags";
export interface Fallback {
    fallback?: React.ReactNode;
}
export type NonNullableElements<T extends readonly any[]> = {
    -readonly [P in keyof T]: NonNullable<T[P]>;
};
/**
 * HTML 태그별 헬퍼 타입을 자동 생성하는 유틸리티
 * @template Helper - 각 태그에 대한 헬퍼 타입
 */
export type HtmlTagHelpers<Helper> = {
    [K in HtmlTag]: Helper extends {
        tag: infer _T;
    } ? Helper : Helper;
} & {
    [x: string]: Helper;
};
export interface OptionalWrapperProps {
    when: boolean;
    children: React.ReactNode;
    wrapper: (children: React.ReactNode) => React.ReactNode;
    fallback?: (children: React.ReactNode) => React.ReactNode;
}
export interface ObserverProps extends Fallback {
    children?: React.ReactNode | ((isIntersecting: boolean) => React.ReactNode);
    threshold?: number | number[];
    rootMargin?: string;
    triggerOnce?: boolean;
    onIntersect?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}
export interface SwitchProps<T, K extends LiteralKeys<T>> extends Fallback {
    children: Array<ReactElement>;
    when: K;
}
export interface MountProps extends Fallback {
    children: React.ReactNode | (() => React.ReactNode | Promise<React.ReactNode>);
}
export type ExtractValues<T, K extends keyof T> = T extends any ? T[K] : never;
type IsUnion<T, U = T> = T extends any ? [U] extends [T] ? false : true : false;
export type ExtractByKeyValue<T, K extends keyof T, V> = T extends any ? IsUnion<T> extends true ? T[K] extends V ? T : never : V extends T[K] ? T : never : never;
export type GetLiteralKeys<T> = {
    [K in keyof T]: T[K] extends string ? string extends T[K] ? never : K : T[K] extends number ? number extends T[K] ? never : K : T[K] extends boolean ? boolean extends T[K] ? never : K : T[K] extends bigint ? bigint extends T[K] ? never : K : T[K] extends symbol ? symbol extends T[K] ? never : K : never;
}[keyof T];
export type LiteralKeys<T> = [GetLiteralKeys<T>] extends [never] ? keyof T : GetLiteralKeys<T>;
export type SlackerFallbackProps = {
    isLoading: boolean;
    error: Error | null;
    retry: () => void;
};
export type SlackerProps<T = any> = {
    children: (loaded: T) => React.ReactNode;
    errorFallback?: React.ReactNode | ((props: SlackerFallbackProps) => React.ReactNode);
    loadingFallback?: React.ReactNode;
    threshold?: number | number[];
    rootMargin?: string;
    loader: () => Promise<T> | T;
    onError?: (error: Error) => void;
    maxRetries?: number;
    retryDelay?: number;
};
export {};
