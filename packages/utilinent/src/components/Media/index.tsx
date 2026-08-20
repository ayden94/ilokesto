import { useMediaQuery } from "../../hooks/useMediaQuery";
import type { MediaProps } from "./types";

/**
 * Renders children based on a CSS media query match.
 *
 * With a render-prop, receives the current `matches` boolean. Otherwise renders
 * `children` when the query matches and `fallback` when it does not.
 *
 * @example
 * ```tsx
 * <Media query="(min-width: 768px)">{(matches) => matches ? <Desktop/> : <Mobile/>}</Media>
 * <Media query="(min-width: 768px)" fallback={<MobileNav/>}><DesktopNav/></Media>
 * ```
 */
export function Media({ query, children, fallback = null }: MediaProps): React.ReactNode {
  const matches = useMediaQuery(query);

  if (typeof children === "function") {
    return children(matches);
  }

  return matches ? children : fallback;
}