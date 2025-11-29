import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { createElement, forwardRef } from "react";
import { htmlTags } from "../../constants/htmlTags";
import { processForrable } from "./processForrable";
export const Forrable = ({ children }) => {
    return _jsx(_Fragment, { children: children });
};
function BaseFor({ each, children, fallback = null, }) {
    // children이 함수인 경우 (기존 방식)
    if (typeof children === "function") {
        const content = each && each.length > 0 ? each.map(children) : fallback;
        return _jsx(_Fragment, { children: content });
    }
    // children이 ReactNode인 경우 (Forrable 패턴)
    return _jsx(_Fragment, { children: processForrable(children, each, fallback) });
}
const renderForTag = (tag) => 
// forward ref so consumers can attach a ref to the underlying DOM element
forwardRef(({ each, children, fallback = null, ...props }, ref) => {
    // children이 함수인 경우 (기존 방식)
    if (typeof children === "function") {
        const content = each && each.length > 0 ? each.map(children) : fallback;
        return createElement(tag, { ...props, ref }, content);
    }
    // children이 ReactNode인 경우 (Forrable 패턴)
    return createElement(tag, { ...props, ref }, processForrable(children, each, fallback));
});
const tagEntries = htmlTags.reduce((acc, tag) => {
    acc[tag] = renderForTag(tag);
    return acc;
}, {});
export const For = Object.assign(BaseFor, tagEntries);
