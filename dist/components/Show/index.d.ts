import type { ShowType } from "../../types/show";
export declare const Showable: ({ children, fallback }: {
    children: React.ReactNode | ((value: any) => React.ReactNode);
    fallback?: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const Show: ShowType;
