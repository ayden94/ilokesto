import { useCallback, useState } from "react";
import { Observer } from "../Observer";
import { SlackerProps } from "./types";

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
  const [loadedData, setLoadedData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loader();
      setLoadedData(data);
      setRetryCount(0); // 성공 시 재시도 카운트 리셋
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Slacker loader failed:', error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [loader, onError]);

  const retry = useCallback(async () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      await load();
    }
  }, [retryCount, maxRetries, retryDelay, load]);

  const handleIntersect = useCallback(async (isIntersecting: boolean) => {
    if (isIntersecting && !isLoading && loadedData === null) {
      await load();
    }
  }, [isLoading, loadedData, load]);

  // 자동 재시도
  const shouldAutoRetry = error && maxRetries > 0 && retryCount < maxRetries;
  
  if (shouldAutoRetry && !isLoading) {
    retry();
  }

  // 렌더링할 내용 결정
  const renderContent = () => {
    if (loadedData !== null) {
      return children(loadedData);
    }
    
    if (error) {
      return typeof errorFallback === 'function'
        ? errorFallback({ isLoading, error, retry })
        : errorFallback;
    }
    
    if (isLoading) {
      return loadingFallback;
    }
    
    return null;
  };

  return (
    <Observer
      threshold={threshold}
      rootMargin={rootMargin}
      triggerOnce={true}
      onIntersect={handleIntersect}
    >
      {renderContent()}
    </Observer>
  );
}
