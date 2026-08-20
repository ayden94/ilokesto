/**
 * Render-prop props passed to {@link SlackerProps}.`errorFallback`.
 */
export type SlackerFallbackProps = {
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
};

/**
 * Props for {@link Slacker}.
 *
 * Lazily invokes `loader` when the component enters the viewport and manages
 * loading, error, and success states with optional retry.
 *
 * `children` — render function receiving the resolved loader result.
 * `loader` — function returning `T | Promise<T>`; invoked on intersection.
 * `loadingFallback` — rendered while loading.
 * `errorFallback` — ReactNode or render-prop receiving {@link SlackerFallbackProps}.
 * `threshold` / `rootMargin` — IntersectionObserver options (default `0.1` / `"50px"`).
 * `maxRetries` — retry attempts on loader failure (default `0`).
 * `retryDelay` — ms between retries (default `1000`).
 * `onError` — called when the loader throws or rejects.
 */
export type SlackerProps<T = any> = {
  children: (loaded: T) => React.ReactNode;
  errorFallback?: React.ReactNode | ((props: SlackerFallbackProps) => React.ReactNode);
  loadingFallback?: React.ReactNode;
  threshold?: number | number[];
  rootMargin?: string;
  loader: () => Promise<T> | T;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
};
