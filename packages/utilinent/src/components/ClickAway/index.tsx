import { forwardRef, useMemo, useRef } from "react";
import { useClickAway } from "../../hooks/useClickAway";
import { composeRefs } from "../../utils/composeRefs";
import type { ClickAwayProps } from "./types";

/**
 * Invokes `onClickAway` when a pointer/touch event occurs outside the element.
 *
 * Forwards `ref` to the underlying `div`.
 *
 * @example
 * ```tsx
 * <ClickAway onClickAway={() => setOpen(false)}>{children}</ClickAway>
 * ```
 */
export const ClickAway = forwardRef<HTMLDivElement, ClickAwayProps>(function ClickAway(
  { children, onClickAway, ignore, pointerEvents, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  useClickAway(innerRef, onClickAway, { ignore, pointerEvents });

  const mergedRef = useMemo(
    () => composeRefs(innerRef, forwardedRef),
    [innerRef, forwardedRef],
  );

  return (
    <div ref={mergedRef} {...props}>
      {children}
    </div>
  );
});