import { forwardRef, useMemo } from "react";
import type { ComponentPropsWithRef } from "react";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";
import { Show } from "../Show";
import { composeRefs } from "../Slot/composeRefs";
import type { ObserverProps } from "./types";

export const Observer = forwardRef<HTMLDivElement, ObserverProps & Omit<ComponentPropsWithRef<'div'>, 'ref'>>(
  function Observer(
    {
      children,
      fallback = null,
      threshold = 0,
      rootMargin = "0px",
      triggerOnce: freezeOnceVisible = false,
      onIntersect: onChange,
      style,
      ...props
    },
    forwardedRef
  ) {
    const { ref: observerRef, isIntersecting } = useIntersectionObserver({
      threshold,
      rootMargin,
      freezeOnceVisible,
      onChange,
    });

    const mergedRef = useMemo(
      () => composeRefs(observerRef, forwardedRef),
      [observerRef, forwardedRef]
    );

    return (
      <Show.div
        ref={mergedRef}
        when={isIntersecting}
        fallback={fallback}
        style={{
          ...style,
          minHeight: style?.minHeight ?? "1px",
          minWidth: style?.minWidth ?? "1px",
          display: style?.display ?? "block",
        }}
        {...props}
      >
        {typeof children === "function" ? children(isIntersecting) : children}
      </Show.div>
    );
  }
);
