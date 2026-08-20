import { useEffect, useRef, useState } from "react";

/**
 * Returns a throttled copy of `value` that updates at most once per `interval` ms.
 *
 * The latest value is always emitted after the throttle window closes.
 *
 * @example
 * ```tsx
 * const [pos, setPos] = useState(0);
 * const throttled = useThrottle(pos, 100);
 * useEffect(() => track(throttled), [throttled]);
 * ```
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastRunRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const remaining = interval - (now - lastRunRef.current);

    if (remaining <= 0) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastRunRef.current = now;
      setThrottled(value);
    } else if (timerRef.current === null) {
      timerRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        timerRef.current = null;
        setThrottled(value);
      }, remaining);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, interval]);

  return throttled;
}