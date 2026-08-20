import type { UseKeyOptions } from "../../hooks/useKey";

/**
 * Props for {@link Hotkey}.
 *
 * `combo` — a `KeyboardEvent.code` value (e.g. `"Escape"`, `"KeyS"`) or `"*"` for any key.
 * `onPress` — invoked when the key is pressed.
 */
export interface HotkeyProps extends UseKeyOptions {
  combo: string | "*";
  onPress: (event: KeyboardEvent) => void;
}