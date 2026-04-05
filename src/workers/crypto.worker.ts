// Web Worker for offloading heavy cryptographic computations
// Runs on a separate thread — UI stays responsive

import {
  getAllPointsFast,
  getPointOrder,
  scalarMultiply,
  isOnCurve,
  discriminant,
} from '../lib/ec-math';

import {
  generateRSAKeys,
  factorize,
  factorizeToString,
  isPrime,
  nextPrime,
  eulerTotient,
  discreteLogBounded,
  countNgrams,
  sortedNgrams,
} from '../lib/crypto-math';

import { aesGCM } from '../lib/aes-math';

// Registry of functions available to the worker
const FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  // EC Math
  getAllPointsFast: (A: unknown, B: unknown, p: unknown) =>
    getAllPointsFast(BigInt(A as string), BigInt(B as string), BigInt(p as string)),
  getPointOrder: (P: unknown, A: unknown, B: unknown, p: unknown) => {
    const pt = P as { x: string; y: string };
    return getPointOrder({ x: BigInt(pt.x), y: BigInt(pt.y) }, BigInt(A as string), BigInt(B as string), BigInt(p as string));
  },
  scalarMultiply: (k: unknown, P: unknown, A: unknown, p: unknown) => {
    const pt = P as { x: string; y: string };
    return scalarMultiply(BigInt(k as string), { x: BigInt(pt.x), y: BigInt(pt.y) }, BigInt(A as string), BigInt(p as string));
  },
  isOnCurve: (P: unknown, A: unknown, B: unknown, p: unknown) => {
    const pt = P as { x: string; y: string };
    return isOnCurve({ x: BigInt(pt.x), y: BigInt(pt.y) }, BigInt(A as string), BigInt(B as string), BigInt(p as string));
  },
  discriminant: (A: unknown, B: unknown, p: unknown) =>
    discriminant(BigInt(A as string), BigInt(B as string), BigInt(p as string)),
  isPrime: (n: unknown) => isPrime(BigInt(n as string)),

  // RSA
  generateRSAKeys: (bits: unknown, e: unknown) =>
    generateRSAKeys(bits as number, BigInt(e as string)),

  // Factorization
  factorize: (n: unknown) => {
    const factors = factorize(BigInt(n as string));
    // Convert Map to array for serialization
    return Array.from(factors.entries()).map(([p, e]) => [p.toString(), e]);
  },
  factorizeToString: (n: unknown) => factorizeToString(BigInt(n as string)),
  eulerTotient: (n: unknown) => eulerTotient(BigInt(n as string)).toString(),
  nextPrime: (n: unknown) => nextPrime(BigInt(n as string)).toString(),

  // Discrete Log
  discreteLogBounded: (g: unknown, target: unknown, p: unknown, max: unknown) =>
    discreteLogBounded(BigInt(g as string), BigInt(target as string), BigInt(p as string), max as number),

  // AES-GCM
  aesGCM: (pt: unknown, key: unknown, iv: unknown, aad: unknown) =>
    aesGCM(pt as number[], key as number[], iv as number[], aad as number[]),

  // N-gram analysis
  countAndSortNgrams: (text: unknown, n: unknown) =>
    sortedNgrams(countNgrams(text as string, n as number)),
};

// BigInt serialization helpers
function serializeResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (typeof result === 'bigint') return { __bigint: result.toString() };
  if (Array.isArray(result)) return result.map(serializeResult);
  if (result instanceof Map) return Array.from(result.entries()).map(([k, v]) => [serializeResult(k), serializeResult(v)]);
  if (typeof result === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
      obj[k] = serializeResult(v);
    }
    return obj;
  }
  return result;
}

self.onmessage = (e: MessageEvent) => {
  const { fn, args, id } = e.data;
  try {
    const func = FUNCTIONS[fn];
    if (!func) throw new Error(`Unknown function: ${fn}`);
    const result = func(...args);
    self.postMessage({ id, result: serializeResult(result), error: null });
  } catch (err) {
    self.postMessage({ id, result: null, error: String(err) });
  }
};
