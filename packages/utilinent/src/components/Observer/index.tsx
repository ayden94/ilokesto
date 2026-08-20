import { forwardRef, useMemo } from "react";
import type { ComponentPropsWithRef } from "react";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";
import { Show } from "../Show";
import { composeRefs } from "../../utils/composeRefs";
import type { ObserverProps } from "./types";

/**
 * Wraps children in an IntersectionObserver-driven container.
 *
 * Renders `fallback` until the element intersects the viewport, then renders children.
 * Supports a render-prop callback that receives the current `isIntersecting` boolean.
 * Forwards `ref` to the underlying `div`.
 *
 * @example
 * ```tsx
 * <Observer fallback={<Placeholder />} rootMargin="100px">
 *   {(isIntersecting) => isIntersecting ? <Content /> : <Spinner />}
 * </Observer>
 * ```
 */
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
