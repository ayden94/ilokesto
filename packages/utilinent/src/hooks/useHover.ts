import { useCallback, useState, type RefObject } from "react";
import { useEventListener } from "./useEventListener";

/**
 * Return value of {@link useHover}.
 */
interface UseHoverResult {
  ref: (node: HTMLElement | null) => void;
  isHovering: boolean;
}

/**
 * Tracks whether an element is being hovered.
 *
 * Returns a `ref` callback to attach to the target and the current
 * `isHovering` state.
 *
 * @example
 * ```tsx
 * const { ref, isHovering } = useHover();
 * return <div ref={ref}>{isHovering ? 'Hovering' : 'Idle'}</div>;
 * ```
 */
export function useHover(): UseHoverResult {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEventListener(element, "mouseenter", () => setIsHovering(true));
  useEventListener(element, "mouseleave", () => setIsHovering(false));

  return { ref, isHovering };
}

/**
 * Tracks hover state on a stable ref.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const isHovering = useHoverRef(ref);
 * ```
 */
export function useHoverRef(ref: RefObject<HTMLElement | null>): boolean {
  const [isHovering, setIsHovering] = useState(false);

  useEventListener(ref, "mouseenter", () => setIsHovering(true));
  useEventListener(ref, "mouseleave", () => setIsHovering(false));

  return isHovering;
}