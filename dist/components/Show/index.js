import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { createElement, forwardRef } from "react";
import { htmlTags } from "../../constants/htmlTags";
import { renderShowContent } from "./renderShowContent";
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
