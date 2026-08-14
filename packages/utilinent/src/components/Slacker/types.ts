export type SlackerFallbackProps = {
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
};

export type SlackerProps<T = any> = {
  children: (loaded: T) => React.ReactNode;            // loader의 결과를 받는 함수
  errorFallback?: React.ReactNode | ((props: SlackerFallbackProps) => React.ReactNode);  // 에러 발생 시에 표시할 내용
  loadingFallback?: React.ReactNode; // 로딩 중 표시할 내용
  threshold?: number | number[];
  rootMargin?: string;
  loader: () => Promise<T> | T;                         // 동적 로딩 함수 (필수)
  onError?: (error: Error) => void;                     // 에러 콜백
  maxRetries?: number;                                  // 최대 재시도 횟수 (기본: 0)
  retryDelay?: number;                                  // 재시도 딜레이 ms (기본: 1000)
};
