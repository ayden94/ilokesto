import type { RefObject } from "react";

/**
 * Props for {@link ClickAway}.
 *
 * `onClickAway` — invoked when a pointer/touch event occurs outside the element.
 * `ignore` — additional refs whose contents are also considered "inside".
 * `pointerEvents` — detect `pointerdown` instead of `mousedown`/`touchstart`.
 */
export interface ClickAwayProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
  onClickAway: (event: MouseEvent | TouchEvent | PointerEvent) => void;
  ignore?: RefObject<HTMLElement | null>[];
  pointerEvents?: boolean;
}