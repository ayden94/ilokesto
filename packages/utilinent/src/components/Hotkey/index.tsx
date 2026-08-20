import { useKey } from "../../hooks/useKey";
import type { HotkeyProps } from "./types";

/**
 * Declares a keyboard hotkey. Renders nothing.
 *
 * @example
 * ```tsx
 * <Hotkey combo="Escape" onPress={close} />
 * <Hotkey combo="KeyS" onPress={save} ignoreEditable />
 * ```
 */
export function Hotkey({ combo, onPress, ...options }: HotkeyProps): null {
  useKey(combo, onPress, options);
  return null;
}