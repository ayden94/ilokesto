import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Props for {@link ErrorBoundary}.
 *
 * `fallback` — ReactNode or a render-prop receiving `{ error, reset }`.
 * `onError` — called when a descendant throws during render.
 * `resetKeys` — when these values change, the boundary resets its error state.
 */
export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode | ((state: { error: Error; reset: () => void }) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  error: Error | undefined;
}

/**
 * Catches render errors in descendants and renders `fallback` instead.
 *
 * Pair with {@link Mount} (which handles async errors) to cover both
 * synchronous render errors and asynchronous factory errors.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={({ error, reset }) => <button onClick={reset}>Retry</button>}>
 *   <RiskyWidget />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({ error: undefined });
    }
  }

  reset = (): void => {
    this.setState({ error: undefined });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const { fallback } = this.props;
    if (typeof fallback === "function") {
      return fallback({ error, reset: this.reset });
    }
    return fallback ?? null;
  }
}