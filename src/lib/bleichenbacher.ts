// Bleichenbacher (1998) adaptive chosen-ciphertext attack on PKCS#1 v1.5.
// Pure algorithmic implementation — the oracle is passed in so tests and the
// UI page can share this module. Intentionally optimized for clarity over
// micro-performance; parameters are sized for browser execution.
//
// Reference: D. Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols
// Based on the RSA Encryption Standard PKCS #1", CRYPTO '98.
//
// Step numbering below follows the original paper:
//   Step 1: Blinding — we skip this because we start with a conforming ciphertext.
//   Step 2a: Starting the search — find smallest s ≥ ⌈n / 3B⌉ such that (c * s^e) is conforming.
//   Step 2b: Searching with more than one interval — s_{i} = s_{i-1}+1 upward.
//   Step 2c: Searching with one interval — two-dimensional search over (r, s).
//   Step 3: Narrowing the set of solutions — for each [a,b] in M, compute the
//           new bounds from the relation  2B + r·n ≤ s·m ≤ 3B-1 + r·n.
//   Step 4: Computing the solution — terminate when M = {[a,a]}.

import { modPow, mod } from './ec-math';

export interface Interval { low: bigint; high: bigint }

export interface BleichenbacherResult {
  recovered: bigint | null;       // the plaintext m (= paddedM), or null if budget exhausted
  queries: number;                // total oracle queries made
  iterations: number;             // Bleichenbacher outer-loop iterations
  finalIntervals: Interval[];     // final set M (length ≥ 1)
  history: Array<{                // iteration-by-iteration snapshot for the UI
    iter: number;
    s: bigint;
    intervals: Interval[];
    cumulativeQueries: number;
  }>;
  hitBudget: boolean;
}

export interface BleichenbacherParams {
  n: bigint;                      // RSA modulus
  e: bigint;                      // public exponent
  c: bigint;                      // conforming ciphertext (= m^e mod n)
  k: number;                      // byte length of the modulus
  oracle: (x: bigint) => boolean; // returns true iff x has valid PKCS-style prefix
  queryBudget?: number;           // max oracle calls before giving up (default 2e6)
  iterationBudget?: number;       // max outer-loop iterations (default 5000)
}

// Ceiling and floor division for BigInt (JavaScript BigInt `/` truncates toward 0).
function ceilDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new Error('ceilDiv: b must be positive');
  if (a >= 0n) return (a + b - 1n) / b;
  // a negative: -(-a)/b rounded down → standard ceil
  return -((-a) / b);
}
function floorDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new Error('floorDiv: b must be positive');
  if (a >= 0n) return a / b;
  const q = (-a) / b;
  return -((-a) % b === 0n ? q : q + 1n);
}

function bmax(a: bigint, b: bigint): bigint { return a > b ? a : b; }
function bmin(a: bigint, b: bigint): bigint { return a < b ? a : b; }

// Merge overlapping/adjacent intervals and drop empties.
function mergeIntervals(list: Interval[]): Interval[] {
  const valid = list.filter(iv => iv.low <= iv.high);
  if (valid.length <= 1) return valid;
  valid.sort((x, y) => (x.low < y.low ? -1 : x.low > y.low ? 1 : 0));
  const merged: Interval[] = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const last = merged[merged.length - 1];
    if (valid[i].low <= last.high + 1n) {
      if (valid[i].high > last.high) last.high = valid[i].high;
    } else {
      merged.push(valid[i]);
    }
  }
  return merged;
}

// Step 3: narrow each interval given the newly-found multiplier s_i.
function narrow(M: Interval[], s: bigint, n: bigint, B: bigint): Interval[] {
  const twoB = 2n * B;
  const threeB = 3n * B;
  const next: Interval[] = [];
  for (const { low: a, high: b } of M) {
    // r bounds come from:  a*s ≤ 2B + r*n  and  b*s ≥ 3B - 1 + r*n
    const rLow = ceilDiv(a * s - (threeB - 1n), n);
    const rHigh = floorDiv(b * s - twoB, n);
    for (let r = rLow; r <= rHigh; r++) {
      const newLow = bmax(a, ceilDiv(twoB + r * n, s));
      const newHigh = bmin(b, floorDiv(threeB - 1n + r * n, s));
      if (newLow <= newHigh) next.push({ low: newLow, high: newHigh });
    }
  }
  return mergeIntervals(next);
}

export function runBleichenbacher(params: BleichenbacherParams): BleichenbacherResult {
  const { n, e, c, k, oracle } = params;
  const queryBudget = params.queryBudget ?? 2_000_000;
  const iterationBudget = params.iterationBudget ?? 5_000;

  const B = 1n << BigInt(8 * (k - 2));
  const twoB = 2n * B;
  const threeB = 3n * B;

  let queries = 0;
  const history: BleichenbacherResult['history'] = [];

  // Verify the starting ciphertext is conforming (sanity).
  // We do NOT count this as a query since it's an invariant check.
  // If the caller passed a non-conforming c the attack cannot start.
  // (This matches paper's "i=1, s_0=1" branch.)

  // Query the oracle with (c * s^e) mod n. Counts as one oracle call.
  function query(s: bigint): boolean {
    queries++;
    const modified = mod(c * modPow(s, e, n), n);
    return oracle(modified);
  }

  // Initial interval: M_0 = { [2B, 3B-1] }
  let M: Interval[] = [{ low: twoB, high: threeB - 1n }];
  let s = ceilDiv(n, threeB); // Step 2a starting point
  let iter = 0;
  let hitBudget = false;

  while (iter < iterationBudget) {
    iter++;

    // ---------- Step 2 ----------
    if (iter === 1) {
      // Step 2a: search s ≥ ⌈n/3B⌉ upward
      while (queries < queryBudget && !query(s)) s++;
    } else if (M.length >= 2) {
      // Step 2b: search s > s_{i-1} upward
      s++;
      while (queries < queryBudget && !query(s)) s++;
    } else {
      // Step 2c: single interval [a, b] — search over (r, s) pairs.
      const { low: a, high: b } = M[0];
      let r = ceilDiv(2n * (b * s - twoB), n);
      let found = false;
      outer: while (!found && queries < queryBudget) {
        const sLow = ceilDiv(twoB + r * n, b);
        const sHigh = floorDiv(threeB - 1n + r * n, a);
        for (let sCand = sLow; sCand <= sHigh; sCand++) {
          if (queries >= queryBudget) break outer;
          if (query(sCand)) { s = sCand; found = true; break; }
        }
        r++;
      }
      if (!found) { hitBudget = true; break; }
    }

    if (queries >= queryBudget) { hitBudget = true; break; }

    // ---------- Step 3: narrow ----------
    M = narrow(M, s, n, B);
    history.push({ iter, s, intervals: M.map(iv => ({ ...iv })), cumulativeQueries: queries });

    if (M.length === 0) {
      // This should not happen with a correct oracle and conforming c. Bail.
      break;
    }

    // ---------- Step 4: check for solution ----------
    if (M.length === 1 && M[0].low === M[0].high) {
      return {
        recovered: M[0].low,
        queries,
        iterations: iter,
        finalIntervals: M,
        history,
        hitBudget: false,
      };
    }
  }

  return {
    recovered: null,
    queries,
    iterations: iter,
    finalIntervals: M,
    history,
    hitBudget: hitBudget || iter >= iterationBudget,
  };
}
