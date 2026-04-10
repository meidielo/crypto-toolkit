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

// ---------- Argument validators ----------
// The worker is called over postMessage with structured-clone data, so we can't
// rely on TypeScript types at runtime. Each validator throws a clear error
// identifying which argument of which function is malformed, so a user pasting
// garbage input gets "RSA keygen: bits must be an integer between 8 and 4096"
// instead of a generic "Worker error: Cannot convert … to a BigInt".

function assertString(v: unknown, label: string): string {
  if (typeof v !== 'string') throw new Error(`${label}: expected string, got ${typeof v}`);
  return v;
}
function assertBigIntStr(v: unknown, label: string): bigint {
  const s = assertString(v, label);
  if (s.length === 0 || s.length > 2000) throw new Error(`${label}: string length out of range`);
  try { return BigInt(s); }
  catch { throw new Error(`${label}: not a valid integer string`); }
}
function assertPositiveBigIntStr(v: unknown, label: string): bigint {
  const n = assertBigIntStr(v, label);
  if (n <= 0n) throw new Error(`${label}: must be positive`);
  return n;
}
function assertInt(v: unknown, label: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error(`${label}: expected integer`);
  if (v < min || v > max) throw new Error(`${label}: must be in [${min}, ${max}]`);
  return v;
}
function assertPoint(v: unknown, label: string): { x: bigint; y: bigint } {
  if (!v || typeof v !== 'object') throw new Error(`${label}: expected point object`);
  const pt = v as { x?: unknown; y?: unknown };
  return { x: assertBigIntStr(pt.x, `${label}.x`), y: assertBigIntStr(pt.y, `${label}.y`) };
}
function assertByteArray(v: unknown, label: string, maxLen = 1 << 20): number[] {
  if (!Array.isArray(v)) throw new Error(`${label}: expected byte array`);
  if (v.length > maxLen) throw new Error(`${label}: too large (${v.length} > ${maxLen})`);
  for (let i = 0; i < v.length; i++) {
    const b = v[i];
    if (typeof b !== 'number' || !Number.isInteger(b) || b < 0 || b > 255) {
      throw new Error(`${label}[${i}]: not a byte`);
    }
  }
  return v as number[];
}

// Registry of functions available to the worker
const FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  // EC Math
  getAllPointsFast: (A, B, p) =>
    getAllPointsFast(assertBigIntStr(A, 'A'), assertBigIntStr(B, 'B'), assertPositiveBigIntStr(p, 'p')),
  getPointOrder: (P, A, B, p) =>
    getPointOrder(assertPoint(P, 'P'), assertBigIntStr(A, 'A'), assertBigIntStr(B, 'B'), assertPositiveBigIntStr(p, 'p')),
  scalarMultiply: (k, P, A, p) =>
    scalarMultiply(assertBigIntStr(k, 'k'), assertPoint(P, 'P'), assertBigIntStr(A, 'A'), assertPositiveBigIntStr(p, 'p')),
  isOnCurve: (P, A, B, p) =>
    isOnCurve(assertPoint(P, 'P'), assertBigIntStr(A, 'A'), assertBigIntStr(B, 'B'), assertPositiveBigIntStr(p, 'p')),
  discriminant: (A, B, p) =>
    discriminant(assertBigIntStr(A, 'A'), assertBigIntStr(B, 'B'), assertPositiveBigIntStr(p, 'p')),
  isPrime: (n) => isPrime(assertPositiveBigIntStr(n, 'n')),

  // RSA
  generateRSAKeys: (bits, e) =>
    generateRSAKeys(assertInt(bits, 'bits', 8, 4096), assertPositiveBigIntStr(e, 'e')),

  // Factorization
  factorize: (n) => {
    const factors = factorize(assertPositiveBigIntStr(n, 'n'));
    return Array.from(factors.entries()).map(([p, e]) => [p.toString(), e]);
  },
  factorizeToString: (n) => factorizeToString(assertPositiveBigIntStr(n, 'n')),
  eulerTotient: (n) => eulerTotient(assertPositiveBigIntStr(n, 'n')).toString(),
  nextPrime: (n) => nextPrime(assertPositiveBigIntStr(n, 'n')).toString(),

  // Discrete Log
  discreteLogBounded: (g, target, p, max) =>
    discreteLogBounded(
      assertBigIntStr(g, 'g'),
      assertBigIntStr(target, 'target'),
      assertPositiveBigIntStr(p, 'p'),
      assertInt(max, 'max', 1, 10_000_000),
    ),

  // AES-GCM
  aesGCM: (pt, key, iv, aad) =>
    aesGCM(
      assertByteArray(pt, 'plaintext'),
      assertByteArray(key, 'key'),
      assertByteArray(iv, 'iv'),
      assertByteArray(aad, 'aad'),
    ),

  // N-gram analysis
  countAndSortNgrams: (text, n) =>
    sortedNgrams(countNgrams(assertString(text, 'text'), assertInt(n, 'n', 1, 10))),
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
  // Validate the message envelope before dispatch. Any bad field returns a
  // descriptive error instead of crashing the worker thread.
  const data = e.data as { fn?: unknown; args?: unknown; id?: unknown };
  const id = data?.id;
  try {
    if (!data || typeof data !== 'object') throw new Error('Invalid message: not an object');
    if (typeof data.fn !== 'string') throw new Error('Invalid message: fn must be a string');
    if (!Array.isArray(data.args)) throw new Error('Invalid message: args must be an array');
    const func = FUNCTIONS[data.fn];
    if (!func) throw new Error(`Unknown function: ${data.fn}`);
    const result = func(...data.args);
    self.postMessage({ id, result: serializeResult(result), error: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, result: null, error: msg });
  }
};
