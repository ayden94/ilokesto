import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { createElement, forwardRef } from "react";
import { htmlTags } from "../../constants/htmlTags";
import { renderShowContent } from "./renderShowContent";
/**
 * Showable 컴포넌트는 실제로는 렌더링되지 않고,
 * Show 컴포넌트가 이를 찾아서 when 값을 전달하고 조건부 렌더링 처리
 * Forrable과 동일한 패턴
 */
export const Showable = ({ children, fallback = null }) => {
    return _jsx(_Fragment, { children: children });
};
const BaseShow = ({ when, children, fallback = null }) => {
    return _jsx(_Fragment, { children: renderShowContent(when, children, fallback) });
};
const renderForTag = (tag) => 
// forward ref so consumers like Observer can pass a ref to the real DOM element
forwardRef(function Render({ when, children, fallback = null, ...props }, ref) {
    return createElement(tag, { ...props, ref }, renderShowContent(when, children, fallback));
});
const tagEntries = htmlTags.reduce((acc, tag) => {
    acc[tag] = renderForTag(tag);
    return acc;
}, {});
export const Show = Object.assign(BaseShow, tagEntries);
