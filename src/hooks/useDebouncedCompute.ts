import { useState, useEffect } from 'react';

/**
 * Debounce a value — returns the value after `delay` ms of no changes.
 * Use for inputs that trigger expensive computations (curve validation, ngram analysis).
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
