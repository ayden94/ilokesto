import {
  ComponentPropsWithRef,
  createElement,
  forwardRef
} from "react";
import { createProxy } from "../../core/createProxy";
import { resolveWhen } from "../../utils/resolveWhen";
import { flattenChildren } from "./flattenChildren";
import { isMatchElement } from "./Match";
import { SwitchProps, SwitchType } from "./types";

function BaseSwitch({ children, fallback = null }: SwitchProps) {
  const childArray = flattenChildren(children);

  for (const child of childArray) {
    if (!isMatchElement(child)) {
      continue;
    }

    const { when } = child.props;
    if (!resolveWhen(when)) {
      continue;
    }

    return child;
  }

  return fallback;
}

const renderForTag =
  (tag: any) =>
  forwardRef(function Render(
    { children, fallback = null, ...props }: SwitchProps & ComponentPropsWithRef<any>,
    ref: any
  ) {
    const content = BaseSwitch({ children, fallback });
    return createElement(tag, { ...props, ref }, content);
  });

export const Switch: SwitchType = createProxy(BaseSwitch, renderForTag, "switch");
