import { forwardRef, useMemo } from "react";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { composeRefs } from "../../utils/composeRefs";
import type { MeasureProps } from "./types";

/**
 * Measures its container via `ResizeObserver` and passes `{ width, height }`
 * to a render-prop. Forwards `ref` to the underlying `div`.
 *
 * @example
 * ```tsx
 * <Measure>{({ width, height }) => <span>{width}×{height}</span>}</Measure>
 * ```
 */
export const Measure = forwardRef<HTMLDivElement, MeasureProps>(function Measure(
  { children, box, initialSize, ...props },
  forwardedRef,
) {
  const { ref: measureRef, width, height } = useResizeObserver({ box, initialSize });

  const mergedRef = useMemo(
    () => composeRefs(measureRef, forwardedRef),
    [measureRef, forwardedRef],
  );

  return (
    <div ref={mergedRef} {...props}>
      {typeof children === "function" ? children({ width, height }) : children}
    </div>
  );
});