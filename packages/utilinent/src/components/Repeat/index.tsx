import { ComponentPropsWithRef, createElement, forwardRef } from "react";
import { createProxy } from "../../core/createProxy";
import type { RepeatProps, RepeatType } from "./types";

function BaseRepeat({ times, children, fallback = null }: RepeatProps) {
  const content =
        times && times > 0 && Number.isInteger(times)
          ? Array.from({ length: times }, (_, i) => children(i))
          : fallback ?? null;

  return <>{content}</>;
}

const renderForTag =
  (tag: any) =>
  forwardRef(
    ({ times, children, fallback = null, ...props }: RepeatProps & ComponentPropsWithRef<any>, ref: any) => {
      const content =
        BaseRepeat({ times, children, fallback });
      return createElement(tag, { ...props, ref }, content);
    }
  );

export const Repeat : RepeatType = createProxy(BaseRepeat, renderForTag, "repeat");
