import { useState, useEffect, useRef } from 'react';

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

/**
 * Debounced computation — runs `compute` function after input stabilizes.
 * Returns { result, computing } where computing indicates the debounce is pending.
 */
export function useDebouncedCompute<TInput, TResult>(
  input: TInput,
  compute: (input: TInput) => TResult,
  delay: number = 300
): { result: TResult | null; computing: boolean } {
  const [result, setResult] = useState<TResult | null>(null);
  const [computing, setComputing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setComputing(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        setResult(compute(input));
      } catch {
        setResult(null);
      }
      setComputing(false);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input, delay]); // intentionally exclude compute to avoid infinite loops

  return { result, computing };
}
