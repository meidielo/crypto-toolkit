// Shared number-theoretic and CSPRNG utilities.
// All random functions use crypto.getRandomValues — see eslint config for the
// platform-wide ban on Math.random.

// ---------- Integer roots (Newton's method, BigInt) ----------

// Floor integer square root. Throws on negative input.
export function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('isqrt of negative');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}

// Floor integer cube root. Returns 0 for non-positive input.
export function icbrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  const bits = n.toString(2).length;
  let x = 1n << BigInt(Math.ceil(bits / 3));
  // Newton iteration
  while (true) {
    const x1 = (2n * x + n / (x * x)) / 3n;
    if (x1 >= x) break;
    x = x1;
  }
  // Fine-tune upward in case initial guess was too low
  while ((x + 1n) * (x + 1n) * (x + 1n) <= n) x++;
  return x;
}

// ---------- CSPRNG helpers ----------

// Fills a Uint8Array with crypto-random bytes. Thin wrapper for intent.
export function randBytes(len: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(len));
}

// Uniform random number in [0, q) using rejection sampling on a 32-bit source.
// Plain `getRandomValues(Uint32Array) % q` is biased unless q divides 2^32
// evenly — this matters for small moduli in educational protocols (Shamir,
// Schnorr) where the bias is observable.
export function randMod(q: number): number {
  if (q <= 0 || !Number.isInteger(q)) throw new Error('randMod: q must be a positive integer');
  if (q === 1) return 0;
  // Largest multiple of q that fits in 2^32
  const limit = Math.floor(0x1_0000_0000 / q) * q;
  const buf = new Uint32Array(1);
  // Expected iterations < 2 even in the worst case
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % q;
  }
}

// Uniform random BigInt in [0, q) using rejection sampling. q must be > 0.
export function randModBig(q: bigint): bigint {
  if (q <= 0n) throw new Error('randModBig: q must be positive');
  if (q === 1n) return 0n;
  const bits = q.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const extraBits = bytes * 8 - bits; // top bits we must mask off
  const buf = new Uint8Array(bytes);
  for (;;) {
    crypto.getRandomValues(buf);
    // Mask the top byte so the candidate fits in `bits` bits
    if (extraBits > 0) buf[0] &= 0xff >> extraBits;
    let n = 0n;
    for (const b of buf) n = (n << 8n) | BigInt(b);
    if (n < q) return n;
  }
}
