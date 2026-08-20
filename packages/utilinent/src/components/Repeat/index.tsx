import { createProxy } from "../../core/createProxy";
import { createTagRenderer } from "../../core/createTagRenderer";
import type { RepeatProps, RepeatType } from "./types";

function BaseRepeat({ times, children, fallback = null }: RepeatProps) {
  const content =
    times && times > 0 && Number.isInteger(times)
      ? Array.from({ length: times }, (_, i) => children(i))
      : fallback ?? null;

  return <>{content}</>;
}

const renderForTag = createTagRenderer(
  BaseRepeat as (props: any) => React.ReactNode,
  ["times", "children", "fallback"],
  { fallback: null },
);

export const Repeat: RepeatType = createProxy(BaseRepeat, renderForTag, "repeat");