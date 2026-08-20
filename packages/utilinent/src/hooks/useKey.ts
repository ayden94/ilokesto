import { useEffect } from "react";

/**
 * Options for {@link useKey}.
 */
export interface UseKeyOptions {
  /** When `false`, the handler is not invoked. */
  enabled?: boolean;
  /** Require the listener on `keydown` (default) or `keyup`. */
  event?: "keydown" | "keyup";
  /** Ignore events originating from editable elements (input, textarea, select, contenteditable). */
  ignoreEditable?: boolean;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  return EDITABLE_TAGS.has(target.tagName);
}

/**
 * Invokes `handler` when a key matching `key` (a `KeyboardEvent.code` value or
 * `*` for any key) is pressed.
 *
 * @example
 * ```tsx
 * useKey('Escape', () => close());
 * useKey('KeyS', save, { event: 'keydown', ignoreEditable: true });
 * ```
 */
export function useKey(
  key: string | "*",
  handler: (event: KeyboardEvent) => void,
  options: UseKeyOptions = {},
): void {
  const { enabled = true, event = "keydown", ignoreEditable = false } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      if (key !== "*" && event.code !== key) {
        return;
      }
      if (ignoreEditable && isEditableTarget(event.target)) {
        return;
      }
      handler(event);
    };

    window.addEventListener(event, listener);
    return () => {
      window.removeEventListener(event, listener);
    };
  }, [key, handler, enabled, event, ignoreEditable]);
}