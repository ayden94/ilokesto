---
"@ilokesto/utilinent": minor
---

Add browser-observation hooks, companion components, and API cleanups.

New hooks:
- `useEventListener` — attach DOM listeners to a window/document/element target or ref.
- `useResizeObserver` — track element size; returns `ref`, `width`, `height`.
- `useMediaQuery` — subscribe to a CSS media query (SSR-safe).
- `useClickAway` — invoke a handler on outside pointer/touch events.
- `useHover` / `useHoverRef` — track hover state.
- `useKey` — invoke a handler on a key press (`KeyboardEvent.code` or `"*"`).
- `useDebounce` / `useThrottle` — debounce/throttle a value.
- `useIsomorphicLayoutEffect` — now exported as a public hook.

New components:
- `Measure` — `ResizeObserver`-driven size render prop.
- `Media` — render children based on a media query match.
- `ClickAway` — outside-click wrapper.
- `Hoverable` — hover render prop.
- `Hotkey` — declarative keyboard hotkey.
- `ErrorBoundary` — catch render errors with a `fallback` (pairs with `Mount`).
- `ClientOnly` — render children only after client mount (SSR-safe).

API cleanups (non-breaking):
- `useIntersectionObserver` option `onChange` renamed to `onIntersect` to match `Observer`; `onChange` kept as a deprecated alias.
- `OptionalWrapper` adds `elseWrapper`; `fallback` kept as a deprecated alias.
- `Observer` adds `keepMeasurable` (opt-in 1x1 measurable box) and defaults `rootMargin` to `"0%"` to match the hook.
- Removed the duplicate `Slot/composeRefs.ts` re-export.
- Fixed a malformed `Switch` JSDoc example.
- Updated `AGENTS.md` / skill to reflect existing tests.