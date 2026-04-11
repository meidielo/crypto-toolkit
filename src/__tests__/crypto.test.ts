import { describe, it, expect } from 'vitest';
import { aesECB, aesECBDecrypt, aesGCM, hexToBytesAES, bytesToHexAES } from '../lib/aes-math';
import { SHA256 } from '../lib/sha256';
import { hmacSHA256 } from '../lib/web-crypto';
import { mod, modPow, modInverse, scalarMultiply, pointAdd, isInfinity, tonelliShanks, type ECPoint } from '../lib/ec-math';
import { isPrime, gcd, eulerTotient, factorize, pollardRho, factorizeFast } from '../lib/crypto-math';

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

  // FIPS 197 Appendix B — second key/pt/ct triple (independent decrypt validation)
  it('encrypts FIPS 197 second test vector', () => {
    const k2 = hexToBytesAES('000102030405060708090a0b0c0d0e0f');
    const p2 = hexToBytesAES('00112233445566778899aabbccddeeff');
    expect(bytesToHexAES(aesECB(p2, k2))).toBe('69c4e0d86a7b0430d8cdb78070b4c55a');
  });

  it('decrypts FIPS 197 second test vector independently', () => {
    const k2 = hexToBytesAES('000102030405060708090a0b0c0d0e0f');
    const ct2 = hexToBytesAES('69c4e0d86a7b0430d8cdb78070b4c55a');
    expect(bytesToHexAES(aesECBDecrypt(ct2, k2))).toBe('00112233445566778899aabbccddeeff');
  });

  it('round-trips random data', () => {
    // CSPRNG per repo-wide ban on Math.random (see eslint config)
    const randomPt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(16)));
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

  it('pollardRho finds a factor of a semiprime', () => {
    // 15-digit semiprime: 104729 × 104743 = 10967652047n
    const n = 104729n * 104743n;
    const factor = pollardRho(n);
    expect(factor).not.toBe(1n);
    expect(factor).not.toBe(n);
    expect(n % factor).toBe(0n);
  });

  it('factorizeFast handles large semiprimes beyond trial division', () => {
    // Two 8-digit primes — trial division alone would need 10^8 iterations
    const p = 10000019n;
    const q = 10000079n;
    const n = p * q; // ~10^14
    const f = factorizeFast(n);
    expect(f.size).toBe(2);
    expect(f.has(p)).toBe(true);
    expect(f.has(q)).toBe(true);
  });
});

// ============= AES-GCM NIST SP 800-38D =============

describe('AES-GCM', () => {
  // NIST SP 800-38D Test Case 3: 128-bit key, 96-bit IV, 128-bit plaintext, no AAD
  // Key:  feffe9928665731c6d6a8f9467308308
  // IV:   cafebabefacedbaddecaf888
  // PT:   d9313225f88406e5a55909c5aff5269a
  //       86a7a9531534f7da2e4c303d8a318a72
  //       1c3c0c95956809532fcf0e2449a6b525
  //       b16aedf5aa0de657ba637b391aafd255
  // CT:   42831ec2217774244b7221b784d0d49c
  //       e3aa212f2c02a4e035c17e2329aca12e
  //       21d514b25466931c7d8f6a5aac84aa05
  //       1ba30b396a0aac973d58e091473f5985
  // Tag:  4d5c2af327cd64a62cf35abd2ba6fab4
  it('matches NIST SP 800-38D Test Case 3', () => {
    const key = hexToBytesAES('feffe9928665731c6d6a8f9467308308');
    const iv = hexToBytesAES('cafebabefacedbaddecaf888');
    const pt = hexToBytesAES(
      'd9313225f88406e5a55909c5aff5269a' +
      '86a7a9531534f7da2e4c303d8a318a72' +
      '1c3c0c95956809532fcf0e2449a6b525' +
      'b16aedf5aa0de657ba637b391aafd255'
    );
    const expectedCt =
      '42831ec2217774244b7221b784d0d49c' +
      'e3aa212f2c02a4e035c17e2329aca12e' +
      '21d514b25466931c7d8f6a5aac84aa05' +
      '1ba30b396a0aac973d58e091473f5985';
    const expectedTag = '4d5c2af327cd64a62cf35abd2ba6fab4';

    const result = aesGCM(pt, key, iv, []);
    expect(bytesToHexAES(result.ciphertext)).toBe(expectedCt);
    expect(bytesToHexAES(result.tag)).toBe(expectedTag);
  });

  // NIST SP 800-38D Test Case 2: 128-bit key, empty plaintext, no AAD
  // (verifies tag-only mode)
  it('matches NIST SP 800-38D Test Case 2 (empty plaintext)', () => {
    const key = hexToBytesAES('00000000000000000000000000000000');
    const iv = hexToBytesAES('000000000000000000000000');
    const result = aesGCM([], key, iv, []);
    expect(result.ciphertext).toEqual([]);
    expect(bytesToHexAES(result.tag)).toBe('58e2fccefa7e3061367f1d57a4e7455a');
  });
});

// ============= HMAC-SHA256 RFC 4231 =============

describe('HMAC-SHA256', () => {
  // RFC 4231 Test Case 1
  // Key:   0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b (20 bytes)
  // Data:  4869205468657265 ("Hi There")
  // HMAC:  b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7
  it('RFC 4231 Test Case 1', async () => {
    const key = new Uint8Array(hexToBytesAES('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b'));
    const data = new TextEncoder().encode('Hi There');
    const mac = await hmacSHA256(key, data);
    const hex = Array.from(mac).map(b => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  });

  // RFC 4231 Test Case 2
  // Key:   4a656665 ("Jefe")
  // Data:  7768617420646f2079612077616e7420666f72206e6f7468696e673f
  //        ("what do ya want for nothing?")
  // HMAC:  5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843
  it('RFC 4231 Test Case 2', async () => {
    const key = new TextEncoder().encode('Jefe');
    const data = new TextEncoder().encode('what do ya want for nothing?');
    const mac = await hmacSHA256(key, data);
    const hex = Array.from(mac).map(b => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
});
