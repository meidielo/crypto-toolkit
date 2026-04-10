// Tests covering the core math paths used by the attack demos. The attack
// pages themselves are React components that assemble these primitives; this
// suite exercises the primitives directly so regressions surface immediately,
// without needing a DOM renderer.

import { describe, it, expect } from 'vitest';
import {
  mod, modPow, modInverse, gcd,
  isPrime, generateRSAKeys, rsaEncrypt, rsaDecrypt,
  paillierEncrypt, paillierDecrypt,
  factorize,
  sqrtModP, legendreSymbol,
} from '../lib/crypto-math';
import { aesECB, aesECBDecrypt, hexToBytesAES, bytesToHexAES } from '../lib/aes-math';
import { runBleichenbacher } from '../lib/bleichenbacher';

// ============= RSA (used by RSAAttackWorkflow, Wiener, Bleichenbacher, CRTFault, Coppersmith) =============

describe('RSA encrypt/decrypt', () => {
  it('textbook roundtrip on small primes', () => {
    // p=61, q=53, e=17 → classic RSA worked example
    const p = 61n, q = 53n, e = 17n;
    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    const d = modInverse(e, phi);
    const m = 42n;
    const c = rsaEncrypt(m, e, n);
    const m2 = rsaDecrypt(c, d, n);
    expect(m2).toBe(m);
  });

  it('roundtrip with generated keys', () => {
    const { n, e, d } = generateRSAKeys(32);
    for (const m of [1n, 2n, 42n, n / 3n, n - 2n]) {
      const c = rsaEncrypt(m, e, n);
      expect(rsaDecrypt(c, d, n)).toBe(m);
    }
  });

  it('CRT factorization: gcd(sig_correct - sig_faulty, n) reveals a factor', () => {
    // Boneh-DeMillo-Lipton: if sp_faulty ≢ sp_correct (mod p) but both
    // agree mod q, then gcd of the difference and n equals q.
    const p = 61n, q = 53n, e = 17n;
    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    const d = modInverse(e, phi);
    const m = 42n;
    const dp = mod(d, p - 1n);
    const dq = mod(d, q - 1n);
    const qinv = modInverse(q, p);

    const sp_correct = modPow(m, dp, p);
    const sp_faulty = sp_correct ^ 1n; // flip low bit
    const sq = modPow(m, dq, q);

    const sig_correct = mod(sq + q * mod(qinv * (sp_correct - sq), p), n);
    const sig_faulty  = mod(sq + q * mod(qinv * (sp_faulty  - sq), p), n);

    const diff = sig_correct - sig_faulty;
    const factor = gcd(diff < 0n ? -diff : diff, n);
    expect([p, q]).toContain(factor);
  });
});

// ============= Paillier (used by PaillierWorkflow, referenced by homomorphic demos) =============

describe('Paillier homomorphic addition', () => {
  it('E(m1) * E(m2) mod n² decrypts to m1 + m2 mod n', () => {
    const p = 7n, q = 11n;
    const n = p * q;               // 77
    const nSquared = n * n;        // 5929
    const lambda = (p - 1n) * (q - 1n); // φ(n) = 60; any multiple of λ(n) works for Paillier
    const g = n + 1n;                   // standard choice: g = n+1
    // For g = n+1 the decryption relation simplifies to μ = λ⁻¹ mod n
    const mu = modInverse(lambda, n);

    const m1 = 15n, m2 = 20n, r1 = 3n, r2 = 5n;
    const c1 = paillierEncrypt(m1, r1, n, nSquared, g);
    const c2 = paillierEncrypt(m2, r2, n, nSquared, g);
    // Homomorphic addition: product of ciphertexts
    const cSum = mod(c1 * c2, nSquared);
    const mSum = paillierDecrypt(cSum, lambda, mu, n, nSquared);
    expect(mSum).toBe(mod(m1 + m2, n));
  });
});

// ============= AES-CBC + PKCS#7 (backs the PaddingOracleAttack inverse path) =============

function pkcs7Pad(data: number[], blockSize: number): number[] {
  const padLen = blockSize - (data.length % blockSize);
  return [...data, ...Array(padLen).fill(padLen)];
}
function pkcs7Strip(padded: number[]): number[] {
  const padLen = padded[padded.length - 1];
  return padded.slice(0, padded.length - padLen);
}
function cbcEncrypt(pt: number[], key: number[], iv: number[]): number[] {
  const padded = pkcs7Pad(pt, 16);
  const out: number[] = [];
  let prev = iv;
  for (let i = 0; i < padded.length; i += 16) {
    const blk = padded.slice(i, i + 16).map((b, j) => b ^ prev[j]);
    const ct = aesECB(blk, key);
    out.push(...ct);
    prev = ct;
  }
  return out;
}
function cbcDecrypt(ct: number[], key: number[], iv: number[]): number[] {
  const out: number[] = [];
  let prev = iv;
  for (let i = 0; i < ct.length; i += 16) {
    const block = ct.slice(i, i + 16);
    const dec = aesECBDecrypt(block, key).map((b, j) => b ^ prev[j]);
    out.push(...dec);
    prev = block;
  }
  return pkcs7Strip(out);
}

describe('AES-CBC + PKCS#7 (padding oracle substrate)', () => {
  const key = hexToBytesAES('000102030405060708090a0b0c0d0e0f');
  const iv  = hexToBytesAES('0f0e0d0c0b0a09080706050403020100');

  it('roundtrips a single block', () => {
    const pt = Array.from(new TextEncoder().encode('HELLO WORLD!'));
    const ct = cbcEncrypt(pt, key, iv);
    expect(ct.length).toBe(16); // 12 bytes → 1 block after pad
    expect(cbcDecrypt(ct, key, iv)).toEqual(pt);
  });

  it('roundtrips multi-block plaintext', () => {
    const pt = Array.from(new TextEncoder().encode('The quick brown fox jumps over the lazy dog'));
    const ct = cbcEncrypt(pt, key, iv);
    expect(ct.length % 16).toBe(0);
    expect(cbcDecrypt(ct, key, iv)).toEqual(pt);
  });

  it('aesECBDecrypt is the inverse of aesECB on a known vector', () => {
    // FIPS 197 worked example
    const k = hexToBytesAES('2b7e151628aed2a6abf7158809cf4f3c');
    const p = hexToBytesAES('3243f6a8885a308d313198a2e0370734');
    const c = aesECB(p, k);
    expect(bytesToHexAES(aesECBDecrypt(c, k))).toBe(bytesToHexAES(p));
  });
});

// ============= Number theory sanity (gaps flagged in audit) =============

describe('Miller-Rabin edge cases', () => {
  it('handles small primes', () => {
    for (const p of [2n, 3n, 5n, 7, 11, 13, 17, 19, 23].map(BigInt)) expect(isPrime(p)).toBe(true);
  });
  it('rejects carmichael numbers', () => {
    // 561 = 3×11×17, smallest Carmichael
    expect(isPrime(561n)).toBe(false);
    // 41041 = 7×11×13×41
    expect(isPrime(41041n)).toBe(false);
  });
  it('detects a moderately large prime', () => {
    // Mersenne prime 2^61 − 1
    expect(isPrime((1n << 61n) - 1n)).toBe(true);
  });
});

describe('sqrtModP (quadratic residues)', () => {
  it('sqrt(4) mod 11 ∈ {2, 9}', () => {
    const r = sqrtModP(4n, 11n);
    expect([2n, 9n]).toContain(r);
  });
  it('returns null for non-residue', () => {
    // legendre(3, 11) = 1 actually — use a real non-residue: 2 mod 11
    expect(legendreSymbol(2n, 11n)).toBe(-1);
    expect(sqrtModP(2n, 11n)).toBeNull();
  });
});

describe('factorize', () => {
  it('factorize(2^10 * 3^5 * 7) is exact', () => {
    const f = factorize((1n << 10n) * 243n * 7n);
    expect(f.get(2n)).toBe(10);
    expect(f.get(3n)).toBe(5);
    expect(f.get(7n)).toBe(1);
  });
});

// ============= Bleichenbacher PKCS#1 v1.5 =============
// End-to-end correctness check: the iterative narrowing must recover the exact
// padded plaintext for a toy-sized RSA instance. If this test starts failing,
// the interval arithmetic in step 3 or the step 2a/2b/2c search is broken.
describe('Bleichenbacher', () => {
  it('recovers padded plaintext for a k=3 toy RSA', () => {
    // Modulus must satisfy n > 3B = 3·2^(8(k-2)) = 768 for k=3; pick p,q so
    // that n is comfortably 3 bytes long. 521·523 = 272_483 ∈ [2^16, 2^24).
    const p = 521n, q = 523n;
    const n = p * q;
    const e = 17n;
    const phi = (p - 1n) * (q - 1n);
    const d = modInverse(e, phi);
    const k = 3;
    // A conforming "plaintext" for the simplified 2-byte oracle is just
    // 00 02 M → integer (0x02 << 8) | M ∈ [512, 768) = [2B, 3B).
    const M = 0x42n;
    const padded = (0x02n << 8n) | M; // 0x0242 = 578
    const B = 1n << BigInt(8 * (k - 2));
    expect(padded >= 2n * B && padded < 3n * B).toBe(true);
    const c = modPow(padded, e, n);

    // Oracle: decryption starts with 0x00 0x02, i.e. value lies in [2B, 3B).
    const oracle = (x: bigint): boolean => {
      const plain = modPow(x, d, n);
      return plain >= 2n * B && plain < 3n * B;
    };

    const result = runBleichenbacher({
      n, e, c, k, oracle,
      queryBudget: 2_000_000,
      iterationBudget: 5_000,
    });

    expect(result.recovered).toBe(padded);
    expect(result.hitBudget).toBe(false);
    expect(result.finalIntervals).toHaveLength(1);
    expect(result.finalIntervals[0].low).toBe(padded);
    expect(result.finalIntervals[0].high).toBe(padded);
  }, 60_000);
});
