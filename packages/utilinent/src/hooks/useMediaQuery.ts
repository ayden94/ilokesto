import { useEffect, useState } from "react";

const getInitial = (query: string): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
};

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * SSR-safe: returns `false` on the server and hydrates to the real value
 * on the client without a hydration mismatch warning.
 *
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery('(min-width: 768px)');
 * return isDesktop ? <DesktopNav /> : <MobileNav />;
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getInitial(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener("change", onChange);
    return () => {
      mediaQueryList.removeEventListener("change", onChange);
    };
  }, [query]);

  return matches;
}