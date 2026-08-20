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

/**
 * Renders the first {@link Match} child whose `when` condition is truthy.
 *
 * Falls back to `fallback` when no Match satisfies its condition.
 * Polymorphic: access typed HTML tag variants via `Switch.div`, etc.
 *
 * @example
 * ```tsx
 * <Switch fallback={<Default />}>
 *   <Match when={status === 'loading'}><Spinner /></Match>
 *   <Match when={status === 'error'}><Error /></Match>
 *   <Match when={data}>{(d) => <View data={d} />}</Match>
 * </Switch>
 * ```
 */
export const Switch: SwitchType = createProxy(BaseSwitch, renderForTag, "switch");