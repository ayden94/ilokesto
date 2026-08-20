import { createProxy } from "../../core/createProxy";
import { createTagRenderer } from "../../core/createTagRenderer";
import { resolveWhen } from "../../utils/resolveWhen";
import { flattenChildren } from "./flattenChildren";
import { isMatchElement } from "./Match";
import type { SwitchProps, SwitchType } from "./types";

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

const renderForTag = createTagRenderer(
  BaseSwitch as (props: any) => React.ReactNode,
  ["children", "fallback"],
  { fallback: null },
);

export const Switch: SwitchType = createProxy(BaseSwitch, renderForTag, "switch");