import { useCallback, useEffect, useRef, useState } from "react";
import { Observer } from "../Observer";
import type { SlackerProps } from "./types";

type LoadState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: Error }
  | { readonly status: "success"; readonly data: T };

const IDLE_STATE = { status: "idle" } as const;

export function Slacker<T = any>({
  children,
  errorFallback,
  loadingFallback,
  loader,
  threshold = 0.1,
  rootMargin = "50px",
  onError,
  maxRetries = 0,
  retryDelay = 1000,
}: SlackerProps<T>) {
  const [loadState, setLoadState] = useState<LoadState<T>>(IDLE_STATE);
  const activeRef = useRef(false);
  const activatedRef = useRef(false);
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const retriesUsedRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderRef = useRef(loader);
  const onErrorRef = useRef(onError);
  const maxRetriesRef = useRef(maxRetries);
  const retryDelayRef = useRef(retryDelay);
  const runAttemptRef = useRef<(() => void) | null>(null);

  const invalidate = useCallback(() => {
    generationRef.current += 1;
    inFlightRef.current = false;
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const runAttempt = useCallback(() => {
    runAttemptRef.current?.();
  }, []);

  const retry = useCallback(() => {
    if (
      !activeRef.current ||
      !activatedRef.current ||
      inFlightRef.current ||
      retriesUsedRef.current >= maxRetriesRef.current
    ) {
      return;
    }

    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retriesUsedRef.current += 1;
    runAttempt();
  }, [runAttempt]);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      invalidate();
    };
  }, [invalidate]);

  useEffect(() => {
    runAttemptRef.current = () => {
      if (!activeRef.current || inFlightRef.current) {
        return;
      }

      const generation = generationRef.current;
      inFlightRef.current = true;
      setLoadState({ status: "loading" });

      Promise.resolve()
        .then(() => loaderRef.current())
        .then((data) => {
          if (!activeRef.current || generation !== generationRef.current) {
            return;
          }

          invalidate();
          setLoadState({ status: "success", data });
        })
        .catch((reason: unknown) => {
          if (!activeRef.current || generation !== generationRef.current) {
            return;
          }

          inFlightRef.current = false;
          const error = reason instanceof Error ? reason : new Error(String(reason));
          console.error("Slacker loader failed:", error);
          onErrorRef.current?.(error);
          setLoadState({ status: "error", error });

          if (retriesUsedRef.current < maxRetriesRef.current) {
            const retryGeneration = generationRef.current;
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              if (activeRef.current && retryGeneration === generationRef.current) {
                retry();
              }
            }, retryDelayRef.current);
          }
        });
    };

    return () => {
      runAttemptRef.current = null;
    };
  }, [invalidate, retry]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    maxRetriesRef.current = maxRetries;
  }, [maxRetries]);

  useEffect(() => {
    retryDelayRef.current = retryDelay;
  }, [retryDelay]);

  useEffect(() => {
    if (loaderRef.current === loader) {
      return;
    }

    loaderRef.current = loader;
    invalidate();
    retriesUsedRef.current = 0;
    setLoadState(IDLE_STATE);
    if (activatedRef.current) {
      runAttempt();
    }
  }, [invalidate, loader, runAttempt]);

  const handleIntersect = useCallback(
    (isIntersecting: boolean) => {
      if (!isIntersecting || activatedRef.current) {
        return;
      }

      activatedRef.current = true;
      retriesUsedRef.current = 0;
      runAttempt();
    },
    [runAttempt],
  );

  let content: React.ReactNode = null;
  if (loadState.status === "success") {
    content = children(loadState.data);
  } else if (loadState.status === "error") {
    content =
      typeof errorFallback === "function"
        ? errorFallback({ isLoading: false, error: loadState.error, retry })
        : errorFallback;
  } else if (loadState.status === "loading") {
    content = loadingFallback;
  }

  return (
    <Observer
      threshold={threshold}
      rootMargin={rootMargin}
      triggerOnce={true}
      onIntersect={handleIntersect}
    >
      {content}
    </Observer>
  );
}
