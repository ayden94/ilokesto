import { useCallback, useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { Observer } from "../Observer";
import type { SlackerProps } from "./types";

type LoadState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: Error; readonly generation: number }
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
  const completedRef = useRef(false);
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

  const retry = useCallback((generation: number) => {
    if (
      !activeRef.current ||
      !activatedRef.current ||
      completedRef.current ||
      generation !== generationRef.current ||
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
      if (!activeRef.current || completedRef.current || inFlightRef.current) {
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

          retriesUsedRef.current = 0;
          completedRef.current = true;
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
          setLoadState({ status: "error", error, generation });

          if (retriesUsedRef.current < maxRetriesRef.current) {
            const retryGeneration = generationRef.current;
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              if (activeRef.current && retryGeneration === generationRef.current) {
                retry(retryGeneration);
              }
            }, retryDelayRef.current);
          }
        });
    };

    return () => {
      runAttemptRef.current = null;
    };
  }, [invalidate, retry]);

  useIsomorphicLayoutEffect(() => {
    onErrorRef.current = onError;
    maxRetriesRef.current = maxRetries;
    retryDelayRef.current = retryDelay;
    if (loaderRef.current === loader) {
      return;
    }

    loaderRef.current = loader;
    invalidate();
    completedRef.current = false;
    retriesUsedRef.current = 0;
    setLoadState(IDLE_STATE);
    if (activatedRef.current) {
      runAttempt();
    }
  }, [invalidate, loader, maxRetries, onError, retryDelay, runAttempt]);

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
        ? errorFallback({
            isLoading: false,
            error: loadState.error,
            retry: () => retry(loadState.generation),
          })
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
