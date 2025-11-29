import type { ShowType } from "../../types/show";
/**
 * Showable 컴포넌트는 실제로는 렌더링되지 않고,
 * Show 컴포넌트가 이를 찾아서 when 값을 전달하고 조건부 렌더링 처리
 * Forrable과 동일한 패턴
 */
export declare const Showable: ({ children, fallback }: {
    children: React.ReactNode | ((value: any) => React.ReactNode);
    fallback?: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const Show: ShowType;
