import { useCallback, useEffect, useRef, useState } from 'react';

// Deserialize BigInt values from worker
function deserializeBigInts(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && value !== null && '__bigint' in value) {
    return BigInt((value as { __bigint: string }).__bigint);
  }
  if (Array.isArray(value)) return value.map(deserializeBigInts);
  if (typeof value === 'object' && value !== null) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = deserializeBigInts(v);
    }
    return obj;
  }
  return value;
}

let idCounter = 0;

export function useCryptoWorker<T = unknown>() {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<number, (data: { result: unknown; error: string | null }) => void>>(new Map());
  const latestIdRef = useRef(0); // Track latest request to drop stale responses

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/crypto.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data;
      const resolver = pendingRef.current.get(id);
      if (resolver) {
        resolver({ result, error });
        pendingRef.current.delete(id);
      }
    };

    worker.onerror = (e) => {
      setError(`Worker error: ${e.message}`);
      setLoading(false);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const compute = useCallback((fn: string, args: unknown[]) => {
    if (!workerRef.current) return;

    const id = ++idCounter;
    latestIdRef.current = id; // Mark this as the latest request
    setLoading(true);
    setError(null);

    const promise = new Promise<T>((resolve, reject) => {
      pendingRef.current.set(id, ({ result, error }) => {
        // Drop stale responses — only update state if this is still the latest request
        const isLatest = id === latestIdRef.current;
        if (isLatest) setLoading(false);

        if (error) {
          if (isLatest) setError(error);
          reject(error);
        } else {
          const deserialized = deserializeBigInts(result) as T;
          if (isLatest) setResult(deserialized); // Only update if not superseded
          resolve(deserialized);
        }
      });
    });

    workerRef.current.postMessage({ fn, args, id });

    return promise;
  }, []);

  return { compute, result, loading, error };
}
