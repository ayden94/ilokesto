import { useEffect, useState } from 'react';

const mediaQueryText = '(prefers-reduced-motion: reduce)';

interface LegacyMediaQueryList {
  addListener?: (listener: () => void) => void;
  removeListener?: (listener: () => void) => void;
}

function getInitialPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(mediaQueryText).matches;
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(mediaQueryText);
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);

      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    const legacyMediaQuery = mediaQuery as LegacyMediaQueryList;
    legacyMediaQuery.addListener?.(updatePreference);

    return () => legacyMediaQuery.removeListener?.(updatePreference);
  }, []);

  return prefersReducedMotion;
}
