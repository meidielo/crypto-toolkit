// General cryptographic math utilities using BigInt

import { mod, modPow, modInverse as ecModInverse } from './ec-math';
import { randModBig } from './num-util';

export { mod, modPow };

export function modInverse(a: bigint, m: bigint): bigint {
  return ecModInverse(a, m);
}

// ============= Primality Testing =============

export function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  if (n < 4n) return true;
  if (n % 2n === 0n || n % 3n === 0n) return false;

  // Small primes trial division
  const smallPrimes = [5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];
  for (const p of smallPrimes) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }

  // Miller-Rabin
  return millerRabin(n, 20);
}

// Primality test — hybrid deterministic + probabilistic Miller-Rabin.
// - n < 3.3×10²⁴ (~81 bits): deterministic using the fixed witness set
//   {2,3,5,7,11,13,17,19,23,29,31,37} (proven correct by Sorenson & Webster 2015).
// - n ≥ 3.3×10²⁴: uses all 12 deterministic witnesses PLUS (rounds - 12) random
//   witnesses drawn from crypto.getRandomValues. Each random round has independent
//   false-positive probability ≤ 1/4, so the combined error is ≤ 4^(-rounds).
function millerRabin(n: bigint, rounds: number): boolean {
  let d = n - 1n;
  let r = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    r++;
  }

  const fixedWitnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

  // Build witness list: always start with all fixed witnesses, then add
  // CSPRNG random witnesses for large n to reach the requested round count.
  const toTest: bigint[] = fixedWitnesses.filter(a => a < n - 1n);
  if (n >= 3317044064679887385961981n) {
    const extraNeeded = rounds - toTest.length;
    for (let i = 0; i < extraNeeded; i++) {
      // Random witness in [2, n-2]
      toTest.push(randModBig(n - 3n) + 2n);
    }
  }

  for (const a of toTest) {
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let i = 0n; i < r - 1n; i++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

export function nextPrime(n: bigint): bigint {
  if (n < 2n) return 2n;
  let candidate = n % 2n === 0n ? n + 1n : n + 2n;
  while (!isPrime(candidate)) candidate += 2n;
  return candidate;
}

// ============= GCD / Extended GCD =============

export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b > 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  const absA = a < 0n ? -a : a;
  const absB = b < 0n ? -b : b;
  return (absA / gcd(absA, absB)) * absB;
}

export function extendedGcd(a: bigint, b: bigint): { gcd: bigint; x: bigint; y: bigint } {
  if (b === 0n) return { gcd: a, x: 1n, y: 0n };
  const { gcd: g, x: x1, y: y1 } = extendedGcd(b, a % b);
  return { gcd: g, x: y1, y: x1 - (a / b) * y1 };
}

// ============= Euler's Totient =============

export function eulerTotient(n: bigint): bigint {
  if (n <= 0n) throw new Error('n must be positive');
  if (n === 1n) return 1n;
  let result = n;
  let temp = n;
  for (let p = 2n; p * p <= temp; p++) {
    if (temp % p === 0n) {
      while (temp % p === 0n) temp /= p;
      result -= result / p;
    }
  }
  if (temp > 1n) result -= result / temp;
  return result;
}

// ============= Factorization =============

export function factorize(n: bigint): Map<bigint, number> {
  const factors = new Map<bigint, number>();
  if (n <= 1n) return factors;

  let temp = n;
  for (let p = 2n; p * p <= temp; p++) {
    let count = 0;
    while (temp % p === 0n) {
      temp /= p;
      count++;
    }
    if (count > 0) factors.set(p, count);
  }
  if (temp > 1n) factors.set(temp, 1);
  return factors;
}

// Pollard's rho factorization — finds a non-trivial factor of n in O(n^(1/4)) expected time.
// Much faster than trial division for semiprimes with factors > ~10^6.
// Returns a non-trivial factor, or n if the method fails (n is likely prime).
export function pollardRho(n: bigint): bigint {
  if (n % 2n === 0n) return 2n;
  if (isPrime(n)) return n;

  // Use a fixed pseudo-random function g(x) = x² + c mod n with varying c
  for (let c = 1n; c < 100n; c++) {
    let x = 2n;
    let y = 2n;
    let d = 1n;

    const g = (v: bigint) => mod(v * v + c, n);

    // Floyd's cycle detection
    while (d === 1n) {
      x = g(x);
      y = g(g(y));
      const diff = x > y ? x - y : y - x;
      d = gcd(diff, n);
    }

    if (d !== n) return d;
  }
  return n; // fallback — shouldn't happen for composite n
}

// Enhanced factorization: uses trial division for small factors, then Pollard's
// rho for remaining large composite. Much faster for semiprimes like RSA moduli.
export function factorizeFast(n: bigint): Map<bigint, number> {
  const factors = new Map<bigint, number>();
  if (n <= 1n) return factors;

  let temp = n;

  // Trial division for small factors (up to ~10^4)
  for (let p = 2n; p < 10000n && p * p <= temp; p++) {
    let count = 0;
    while (temp % p === 0n) {
      temp /= p;
      count++;
    }
    if (count > 0) factors.set(p, count);
  }

  // If remainder is composite, use Pollard's rho
  if (temp > 1n) {
    const stack = [temp];
    while (stack.length > 0) {
      const val = stack.pop()!;
      if (val === 1n) continue;
      if (isPrime(val)) {
        factors.set(val, (factors.get(val) || 0) + 1);
        continue;
      }
      const factor = pollardRho(val);
      if (factor === val) {
        // rho failed — treat as prime (extremely unlikely for composites)
        factors.set(val, (factors.get(val) || 0) + 1);
      } else {
        stack.push(factor);
        stack.push(val / factor);
      }
    }
  }

  return factors;
}

export function factorizeToString(n: bigint): string {
  const factors = factorizeFast(n);
  if (factors.size === 0) return n.toString();
  return Array.from(factors.entries())
    .map(([p, e]) => e === 1 ? p.toString() : `${p}^${e}`)
    .join(' × ');
}

// ============= RSA =============

// Generate a random prime of the given bit length. Draws a fresh CSPRNG
// candidate each iteration and tests it independently, per FIPS 186-5
// §B.3.3. This avoids the bias of nextPrime(random), which over-represents
// primes following large composite gaps.
export function generateRandomPrime(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);
  const arr = new Uint8Array(bytes);
  const mask = (1n << BigInt(bits)) - 1n;
  const highBit = 1n << BigInt(bits - 1);

  for (;;) {
    crypto.getRandomValues(arr);
    let n = 0n;
    for (const byte of arr) {
      n = (n << 8n) | BigInt(byte);
    }
    n = n & mask;     // exact bit count
    n |= highBit;     // ensure high bit set (exact bit length)
    n |= 1n;          // ensure odd
    if (isPrime(n)) return n;
  }
}

export interface RSAKeyPair {
  p: bigint;
  q: bigint;
  n: bigint;
  e: bigint;
  d: bigint;
  phi: bigint;
  dp: bigint;
  dq: bigint;
  qinv: bigint;
}

export function generateRSAKeys(bits: number, e: bigint = 65537n): RSAKeyPair {
  const halfBits = Math.floor(bits / 2);
  let p: bigint, q: bigint, phi: bigint;

  let attempts = 0;
  do {
    if (++attempts > 100) throw new Error('RSA key generation failed after 100 attempts — try different parameters');
    p = generateRandomPrime(halfBits);
    q = generateRandomPrime(bits - halfBits);
    phi = (p - 1n) * (q - 1n);
  } while (p === q || gcd(e, phi) !== 1n);

  const n = p * q;
  const d = modInverse(e, phi);
  const dp = mod(d, p - 1n);
  const dq = mod(d, q - 1n);
  const qinv = modInverse(q, p);

  return { p, q, n, e, d, phi, dp, dq, qinv };
}

export function rsaEncrypt(m: bigint, e: bigint, n: bigint): bigint {
  return modPow(m, e, n);
}

export function rsaDecrypt(c: bigint, d: bigint, n: bigint): bigint {
  return modPow(c, d, n);
}

// ============= Base Conversions =============

export function textToHex(text: string): string {
  return Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
}

export function hexToText(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  let result = '';
  for (let i = 0; i < clean.length; i += 2) {
    result += String.fromCharCode(parseInt(clean.substring(i, i + 2), 16));
  }
  return result;
}

export function textToBinary(text: string): string {
  return Array.from(text).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
}

export function binaryToText(bin: string): string {
  const clean = bin.replace(/\s+/g, '');
  let result = '';
  for (let i = 0; i < clean.length; i += 8) {
    result += String.fromCharCode(parseInt(clean.substring(i, i + 8), 2));
  }
  return result;
}

export function textToDecimal(text: string): string {
  return Array.from(text).map(c => c.charCodeAt(0).toString()).join(' ');
}

export function decimalToText(dec: string): string {
  return dec.trim().split(/\s+/).map(n => String.fromCharCode(parseInt(n))).join('');
}

export function textToBase64(text: string): string {
  return btoa(text);
}

export function base64ToText(b64: string): string {
  return atob(b64);
}

export function numberToBase(n: bigint, base: number): string {
  if (n === 0n) return '0';
  const digits = '0123456789abcdef';
  const b = BigInt(base);
  let result = '';
  let temp = n < 0n ? -n : n;
  while (temp > 0n) {
    result = digits[Number(temp % b)] + result;
    temp /= b;
  }
  return (n < 0n ? '-' : '') + result;
}

export function baseToNumber(s: string, base: number): bigint {
  const b = BigInt(base);
  let result = 0n;
  const clean = s.toLowerCase().replace(/^0x/, '');
  for (const c of clean) {
    const digit = '0123456789abcdef'.indexOf(c);
    if (digit === -1 || digit >= base) throw new Error(`Invalid digit '${c}' for base ${base}`);
    result = result * b + BigInt(digit);
  }
  return result;
}

// ============= Cipher Tools =============

export function caesarCipher(text: string, shift: number, decrypt = false): string {
  const s = decrypt ? (26 - (shift % 26)) : (shift % 26);
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c >= 'a' ? 97 : 65;
    return String.fromCharCode(((c.charCodeAt(0) - base + s) % 26) + base);
  });
}

export function vigenereCipher(text: string, key: string, decrypt = false): string {
  if (!key) return text;
  const k = key.toLowerCase();
  let ki = 0;
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c >= 'a' ? 97 : 65;
    const shift = k[ki % k.length].charCodeAt(0) - 97;
    ki++;
    const s = decrypt ? (26 - shift) : shift;
    return String.fromCharCode(((c.charCodeAt(0) - base + s) % 26) + base);
  });
}

export function rot13(text: string): string {
  return caesarCipher(text, 13);
}

export function atbashCipher(text: string): string {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c >= 'a' ? 97 : 65;
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
  });
}

// ============= Paillier Helpers =============

export function paillierL(x: bigint, n: bigint): bigint {
  return (x - 1n) / n;
}

export function paillierEncrypt(m: bigint, r: bigint, n: bigint, nSquared: bigint, g: bigint): bigint {
  const gm = modPow(g, m, nSquared);
  const rn = modPow(r, n, nSquared);
  return mod(gm * rn, nSquared);
}

export function paillierDecrypt(c: bigint, lambda: bigint, mu: bigint, n: bigint, nSquared: bigint): bigint {
  const u = modPow(c, lambda, nSquared);
  const l = paillierL(u, n);
  return mod(l * mu, n);
}

// ============= Discrete Log (Bounded Search) =============

export function discreteLogBounded(g: bigint, target: bigint, p: bigint, maxSearch: number = 10000): bigint | null {
  let current = 1n;
  for (let i = 0; i < maxSearch; i++) {
    if (current === target) return BigInt(i);
    current = mod(current * g, p);
  }
  return null;
}

// ============= N-gram Analysis =============

export function countNgrams(text: string, n: number): Map<string, number> {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const counts = new Map<string, number>();
  for (let i = 0; i <= clean.length - n; i++) {
    const ngram = clean.substring(i, i + n);
    counts.set(ngram, (counts.get(ngram) || 0) + 1);
  }
  return counts;
}

export function sortedNgrams(counts: Map<string, number>): [string, number][] {
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

// ============= Quadratic Residue / Legendre =============

export function legendreSymbol(a: bigint, p: bigint): -1 | 0 | 1 {
  const r = modPow(mod(a, p), (p - 1n) / 2n, p);
  if (r === 0n) return 0;
  if (r === 1n) return 1;
  return -1;
}

export function sqrtModP(a: bigint, p: bigint): bigint | null {
  a = mod(a, p);
  if (a === 0n) return 0n;
  if (legendreSymbol(a, p) !== 1) return null;
  if (p % 4n === 3n) return modPow(a, (p + 1n) / 4n, p);

  // Tonelli-Shanks
  let s = 0n;
  let q = p - 1n;
  while (q % 2n === 0n) { s++; q /= 2n; }

  let z = 2n;
  while (legendreSymbol(z, p) !== -1) z++;

  let m = s;
  let c = modPow(z, q, p);
  let t = modPow(a, q, p);
  let r = modPow(a, (q + 1n) / 2n, p);

  while (true) {
    if (t === 1n) return r;
    let i = 1n;
    let tmp = mod(t * t, p);
    while (tmp !== 1n) { tmp = mod(tmp * tmp, p); i++; }
    const b = modPow(c, modPow(2n, m - i - 1n, p - 1n), p);
    m = i;
    c = mod(b * b, p);
    t = mod(t * c, p);
    r = mod(r * b, p);
  }
}
