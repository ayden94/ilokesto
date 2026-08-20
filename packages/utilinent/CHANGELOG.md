# @ilokesto/utilinent

## 1.2.0

### Minor Changes

- 36fc983: Add browser-observation hooks (behind a `./hooks` subpath), companion components, and API cleanups. The main `.` entry is now components-only; hooks are imported from `@ilokesto/utilinent/hooks`.

  > Migration: update hook imports `from '@ilokesto/utilinent'` to `from '@ilokesto/utilinent/hooks'`. Component imports from `@ilokesto/utilinent` are unchanged.

  New hooks (subpath `./hooks`):

  - `useEventListener` — attach DOM listeners to a window/document/element target or ref.
  - `useResizeObserver` — track element size; returns `ref`, `width`, `height`.
  - `useMediaQuery` — subscribe to a CSS media query (SSR-safe).
  - `useClickAway` — invoke a handler on outside pointer/touch events.
  - `useHover` / `useHoverRef` — track hover state.
  - `useKey` — invoke a handler on a key press (`KeyboardEvent.code` or `"*"`).
  - `useDebounce` / `useThrottle` — debounce/throttle a value.
  - `useIsomorphicLayoutEffect` — now exported publicly (subpath `./hooks`).

  New components (main `.`):

  - `Measure` — `ResizeObserver`-driven size render prop.
  - `Media` — render children based on a media query match.
  - `ClickAway` — outside-click wrapper.
  - `Hoverable` — hover render prop.
  - `Hotkey` — declarative keyboard hotkey.
  - `ErrorBoundary` — catch render errors with a `fallback` (pairs with `Mount`).
  - `ClientOnly` — render children only after client mount (SSR-safe).

  API cleanups (non-breaking unless noted):

  - `useIntersectionObserver` option `onChange` renamed to `onIntersect` to match `Observer`; `onChange` kept as a deprecated alias.
  - `OptionalWrapper` adds `elseWrapper`; `fallback` kept as a deprecated alias.
  - `Observer` adds `keepMeasurable` (opt-in 1x1 measurable box) and defaults `rootMargin` to `"0%"` to match the hook.
  - Removed the duplicate `Slot/composeRefs.ts` re-export.
  - Fixed a malformed `Switch` JSDoc example.
  - Updated `AGENTS.md` / skill to reflect existing tests.

### Patch Changes

- c850635: Introduce Changesets for automated versioning and changelog management
- 95b7cec: Process initially visible IntersectionObserver records so Slacker loads on mount and triggerOnce observers disconnect immediately.
- 44c3b1a: Reject direct Promise-like Mount children with React 19 types while preserving factory-only asynchronous children.
- 33069c5: Propagate React 19 callback-ref cleanup functions through Slot and Observer while preserving composed object refs.
- 8d60e03: Reduce code duplication and improve maintainability across the package. Extract a shared `createTagRenderer` factory that eliminates the per-component `forwardRef` + `createElement` boilerplate duplicated in Show, For, Repeat, Mount, and Switch. Extract `useIsomorphicLayoutEffect`, `isPromiseLike`, and `composeRefs` into shared `hooks/` and `utils/` modules, removing cross-component imports. Unify `RegistryCategory` as the single source of truth for plugin categories so `PluginManager` no longer maintains a separate literal list. Remove unused types (`ExtractValues`, `ExtractByKeyValue`, `GetLiteralKeys`, `LiteralKeys`), dead `SwitchTagHelper` type, and a non-functional generic on `For`'s `renderForTag`. No public API changes.
- 7097e70: Move Slacker loading and retries out of render with deterministic shared retry ownership and stale-work cancellation.
