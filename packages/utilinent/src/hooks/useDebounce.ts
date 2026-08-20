import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * have elapsed without further changes.
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const debounced = useDebounce(query, 300);
 * useEffect(() => search(debounced), [debounced]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}