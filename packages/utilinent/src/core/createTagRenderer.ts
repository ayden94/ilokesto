import { createElement, forwardRef } from "react";

export function createTagRenderer<TProps extends Record<string, any>>(
  renderBase: (props: TProps) => React.ReactNode,
  baseKeys: readonly string[],
  defaults: Partial<TProps> = {},
) {
  return (tag: React.ElementType) =>
    forwardRef<any, any>(function Tagged(props: any, ref: any) {
      const baseProps: Record<string, any> = {};
      const tagProps: Record<string, any> = {};

      for (const key of Object.keys(props)) {
        if (baseKeys.includes(key)) {
          baseProps[key] = props[key];
        } else {
          tagProps[key] = props[key];
        }
      }

      for (const key of Object.keys(defaults)) {
        if (baseProps[key] === undefined) {
          baseProps[key] = (defaults as Record<string, any>)[key];
        }
      }

      const content = renderBase(baseProps as TProps);
      return createElement(tag, { ...tagProps, ref }, content);
    });
}