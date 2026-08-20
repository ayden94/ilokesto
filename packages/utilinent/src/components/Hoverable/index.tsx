import { forwardRef, useMemo } from "react";
import { useHover } from "../../hooks/useHover";
import { composeRefs } from "../../utils/composeRefs";
import type { HoverableProps } from "./types";

/**
 * Tracks hover state and passes `isHovering` to a render-prop.
 *
 * Forwards `ref` to the underlying `div`.
 *
 * @example
 * ```tsx
 * <Hoverable>{(isHovering) => <Card highlighted={isHovering} />}</Hoverable>
 * ```
 */
export const Hoverable = forwardRef<HTMLDivElement, HoverableProps>(function Hoverable(
  { children, ...props },
  forwardedRef,
) {
  const { ref: hoverRef, isHovering } = useHover();

  const mergedRef = useMemo(
    () => composeRefs(hoverRef, forwardedRef),
    [hoverRef, forwardedRef],
  );

  return (
    <div ref={mergedRef} {...props}>
      {typeof children === "function" ? children(isHovering) : children}
    </div>
  );
});