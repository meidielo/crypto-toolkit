// Learning With Errors (LWE) - Educational Post-Quantum Cryptography
// Small-dimension implementation for tracing math by hand

import { randMod } from './num-util';

export interface LWEParams {
  n: number; // dimension
  q: number; // modulus
}

export interface LWEKeyPair {
  A: number[][]; // n×n public matrix
  s: number[];   // n×1 secret vector
  e: number[];   // n×1 error vector
  b: number[];   // n×1 public vector (b = A*s + e mod q)
}

export interface LWECiphertext {
  u: number[]; // n×1 vector
  v: number;   // scalar
}

function mod(a: number, q: number): number {
  return ((a % q) + q) % q;
}

// Matrix-vector multiplication mod q
export function matVecMul(A: number[][], v: number[], q: number): number[] {
  const n = A.length;
  const result: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < v.length; j++) {
      sum += A[i][j] * v[j];
    }
    result[i] = mod(sum, q);
  }
  return result;
}

// Vector dot product mod q
export function vecDot(a: number[], b: number[], q: number): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return mod(sum, q);
}

// Transpose matrix-vector multiply: r^T * A mod q (1×n result)
export function vecMatMul(r: number[], A: number[][], q: number): number[] {
  const n = A[0].length;
  const result: number[] = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = 0; i < r.length; i++) {
      sum += r[i] * A[i][j];
    }
    result[j] = mod(sum, q);
  }
  return result;
}

// Generate small error value from {-1, 0, 1}
function randError(): number {
  return randMod(3) - 1;
}

// Generate random binary value {0, 1}
function randBit(): number {
  return randMod(2);
}

// Key Generation
export function generateLWEKeys(n: number, q: number): LWEKeyPair {
  // Random n×n matrix A
  const A: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => randMod(q))
  );

  // Secret vector s (random mod q)
  const s: number[] = Array.from({ length: n }, () => randMod(q));

  // Error vector e (small values from {-1, 0, 1})
  const e: number[] = Array.from({ length: n }, () => randError());

  // b = A*s + e mod q
  const As = matVecMul(A, s, q);
  const b: number[] = As.map((val, i) => mod(val + e[i], q));

  return { A, s, e, b };
}

// Encrypt a single bit m ∈ {0, 1}
export function lweEncrypt(
  A: number[][],
  b: number[],
  m: number,
  q: number
): { ct: LWECiphertext; r: number[] } {
  const n = A.length;

  // Random binary vector r
  const r: number[] = Array.from({ length: n }, () => randBit());

  // u = A^T * r mod q  (equivalently r^T * A)
  const u = vecMatMul(r, A, q);

  // v = r^T * b + floor(q/2) * m mod q
  const rb = vecDot(r, b, q);
  const v = mod(rb + Math.floor(q / 2) * m, q);

  return { ct: { u, v }, r };
}

// Decrypt
export function lweDecrypt(
  ct: LWECiphertext,
  s: number[],
  q: number
): { bit: number; raw: number; threshold: number } {
  // Compute v - u·s mod q
  const us = vecDot(ct.u, s, q);
  const raw = mod(ct.v - us, q);

  // Map to nearest: 0 or floor(q/2)
  const threshold = Math.floor(q / 2);
  // Distance to 0 vs distance to floor(q/2)
  const dist0 = Math.min(raw, q - raw);
  const distHalf = Math.min(Math.abs(raw - threshold), q - Math.abs(raw - threshold));
  const bit = dist0 <= distHalf ? 0 : 1;

  return { bit, raw, threshold };
}

// Format matrix as string for display
export function matrixToString(A: number[][]): string {
  return A.map(row => row.map(v => v.toString().padStart(3)).join(' ')).join('\n');
}

export function vectorToString(v: number[]): string {
  return '[' + v.join(', ') + ']';
}
