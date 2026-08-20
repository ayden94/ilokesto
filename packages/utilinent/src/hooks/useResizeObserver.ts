import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Options for {@link useResizeObserver}.
 */
interface UseResizeObserverOptions {
  /** Observer box model. Defaults to `content-box`. */
  box?: ResizeObserverBoxOptions;
  /** Initial size before the first observation fires. */
  initialSize?: DOMRectReadOnly;
}

/**
 * Return value of {@link useResizeObserver}.
 */
interface UseResizeObserverResult {
  ref: (node: HTMLElement | null) => void;
  width: number;
  height: number;
  entry: ResizeObserverEntry | undefined;
}

/**
 * Tracks an element's size via `ResizeObserver`.
 *
 * Returns a `ref` callback to attach to the target and the current
 * `width` / `height`. SSR-safe: returns zeros when `ResizeObserver` is
 * unavailable.
 *
 * @example
 * ```tsx
 * const { ref, width, height } = useResizeObserver();
 * return <textarea ref={ref} style={{ width, height }} />;
 * ```
 */
export function useResizeObserver({
  box = "content-box",
  initialSize,
}: UseResizeObserverOptions = {}): UseResizeObserverResult {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<DOMRectReadOnly | undefined>(initialSize);
  const [entry, setEntry] = useState<ResizeObserverEntry | undefined>();

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const [resizeEntry] = entries;
      if (!resizeEntry) {
        return;
      }
      setEntry(resizeEntry);
      setSize(resizeEntry.contentRect);
    });

    observer.observe(element, { box });

    return () => {
      observer.disconnect();
    };
  }, [element, box]);

  return useMemo(
    () => ({
      ref,
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      entry,
    }),
    [ref, size, entry],
  );
}