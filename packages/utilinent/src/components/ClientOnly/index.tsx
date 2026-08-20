import { useState, type ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import type { Fallback } from "../../types";

/**
 * Props for {@link ClientOnly}.
 */
export interface ClientOnlyProps extends Fallback {
  children?: ReactNode;
}

/**
 * Renders children only after mount on the client. Shows `fallback`
 * (default `null`) during SSR and the first client render.
 *
 * Avoids hydration mismatches for browser-only UI.
 *
 * @example
 * ```tsx
 * <ClientOnly fallback={<Skeleton />}><HeavyChart /></ClientOnly>
 * ```
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps): ReactNode {
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : fallback;
}