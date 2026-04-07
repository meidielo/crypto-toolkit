import { describe, it, expect } from 'vitest';
import { aesECB, aesECBDecrypt, hexToBytesAES, bytesToHexAES } from '../lib/aes-math';
import { SHA256 } from '../lib/sha256';
import { mod, modPow, modInverse, scalarMultiply, pointAdd, isInfinity, tonelliShanks, type ECPoint } from '../lib/ec-math';
import { isPrime, gcd, eulerTotient, factorize } from '../lib/crypto-math';

// ============= AES-128 FIPS 197 Appendix B =============

describe('AES-128', () => {
  const key = hexToBytesAES('2b7e151628aed2a6abf7158809cf4f3c');
  const pt = hexToBytesAES('3243f6a8885a308d313198a2e0370734');
  const expectedCt = '3925841d02dc09fbdc118597196a0b32';

  it('encrypts FIPS 197 test vector correctly', () => {
    expect(bytesToHexAES(aesECB(pt, key))).toBe(expectedCt);
  });

  it('decrypts FIPS 197 test vector correctly', () => {
    const ct = hexToBytesAES(expectedCt);
    expect(bytesToHexAES(aesECBDecrypt(ct, key))).toBe(bytesToHexAES(pt));
  });

  it('round-trips: decrypt(encrypt(pt)) === pt', () => {
    const ct = aesECB(pt, key);
    const dec = aesECBDecrypt(ct, key);
    expect(bytesToHexAES(dec)).toBe(bytesToHexAES(pt));
  });

  it('round-trips with second test vector', () => {
    const k2 = hexToBytesAES('000102030405060708090a0b0c0d0e0f');
    const p2 = hexToBytesAES('00112233445566778899aabbccddeeff');
    const c2 = aesECB(p2, k2);
    const d2 = aesECBDecrypt(c2, k2);
    expect(bytesToHexAES(d2)).toBe(bytesToHexAES(p2));
  });

  it('round-trips random data', () => {
    const randomPt = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    const randomKey = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    const ct = aesECB(randomPt, randomKey);
    const dec = aesECBDecrypt(ct, randomKey);
    expect(dec).toEqual(randomPt);
  });
});

// ============= SHA-256 FIPS 180-4 =============

describe('SHA-256', () => {
  it('hashes "abc" correctly (FIPS 180-4)', () => {
    expect(SHA256.hash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('hashes empty string correctly', () => {
    expect(SHA256.hash('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('hashes "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq" correctly', () => {
    expect(SHA256.hash('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))
      .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('parseState validates hex length', () => {
    expect(() => SHA256.parseState('abcd')).toThrow('64 hex');
    expect(() => SHA256.parseState('xyz'.repeat(22))).toThrow('64 hex');
  });

  it('length extension: resume from captured state produces correct hash', () => {
    const secret = 'mysecret';
    const message = 'data';
    const originalHash = SHA256.hash(secret + message);
    const state = SHA256.parseState(originalHash);

    // Compute padding for secret+message
    const inputLen = secret.length + message.length;
    const padNeeded = (55 - (inputLen % 64) + 64) % 64 + 1;
    const processedLen = inputLen + padNeeded + 8;

    // Resume from state with extension
    const ext = 'extended';
    const extender = new SHA256(state, processedLen);
    extender.update(new TextEncoder().encode(ext));
    const forgedHash = extender.digest();

    // Verify against full hash
    const padding = new Uint8Array(padNeeded + 8);
    padding[0] = 0x80;
    const bitLen = BigInt(inputLen * 8);
    for (let i = 7; i >= 0; i--) {
      padding[padNeeded + 7 - i] = Number((bitLen >> BigInt(i * 8)) & 0xffn);
    }
    const fullInput = new Uint8Array([
      ...new TextEncoder().encode(secret + message),
      ...padding,
      ...new TextEncoder().encode(ext),
    ]);
    const expected = SHA256.hashBytes(fullInput);

    expect(forgedHash).toBe(expected);
  });
});

// ============= EC Math =============

describe('EC Math', () => {
  // Curve y² = x³ + x + 1 (mod 23)
  const A = 1n; const p = 23n;
  const P: ECPoint = { x: 0n, y: 1n };
  const Q: ECPoint = { x: 6n, y: 4n };

  it('point addition P + Q', () => {
    const R = pointAdd(P, Q, A, p);
    // P + Q on this curve = (0, 22)
    expect(R.x).toBe(0n);
    expect(R.y).toBe(22n);
  });

  it('scalar multiplication 5P', () => {
    const R = scalarMultiply(5n, P, A, p);
    expect(R.x).toBe(18n);
    expect(R.y).toBe(3n);
  });

  it('28P = O (group order 28 for this curve)', () => {
    const R = scalarMultiply(28n, P, A, p);
    expect(isInfinity(R)).toBe(true);
  });

  it('modInverse(3, 26) = 9', () => {
    expect(modInverse(3n, 26n)).toBe(9n);
  });

  it('modPow(2, 10, 1000) = 24', () => {
    expect(modPow(2n, 10n, 1000n)).toBe(24n);
  });

  it('tonelliShanks(4, 7) = 2 or 5', () => {
    const r = tonelliShanks(4n, 7n);
    expect(r).not.toBeNull();
    expect(mod(r! * r!, 7n)).toBe(4n);
  });
});

// ============= Number Theory =============

describe('Number Theory', () => {
  it('isPrime detects primes correctly', () => {
    expect(isPrime(2n)).toBe(true);
    expect(isPrime(3n)).toBe(true);
    expect(isPrime(97n)).toBe(true);
    expect(isPrime(104729n)).toBe(true);
    expect(isPrime(4n)).toBe(false);
    expect(isPrime(100n)).toBe(false);
    expect(isPrime(1n)).toBe(false);
  });

  it('gcd(240, 46) = 2', () => {
    expect(gcd(240n, 46n)).toBe(2n);
  });

  it('eulerTotient(60) = 16', () => {
    expect(eulerTotient(60n)).toBe(16n);
  });

  it('factorize(360) = 2³ × 3² × 5', () => {
    const f = factorize(360n);
    expect(f.get(2n)).toBe(3);
    expect(f.get(3n)).toBe(2);
    expect(f.get(5n)).toBe(1);
  });
});
