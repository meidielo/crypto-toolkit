import { describe, it, expect } from 'vitest';
import { isqrt, icbrt, randMod, randModBig, randBytes } from '../lib/num-util';

describe('num-util: isqrt', () => {
  it('isqrt(0) = 0', () => expect(isqrt(0n)).toBe(0n));
  it('isqrt(1) = 1', () => expect(isqrt(1n)).toBe(1n));
  it('isqrt(15) = 3', () => expect(isqrt(15n)).toBe(3n));
  it('isqrt(16) = 4', () => expect(isqrt(16n)).toBe(4n));
  it('isqrt(1e18) exact', () => expect(isqrt(10n ** 18n)).toBe(10n ** 9n));
  it('isqrt of a large non-square is floor', () => {
    const n = (10n ** 20n) + 7n;
    const r = isqrt(n);
    expect(r * r <= n).toBe(true);
    expect((r + 1n) * (r + 1n) > n).toBe(true);
  });
  it('throws on negative', () => expect(() => isqrt(-1n)).toThrow());
});

describe('num-util: icbrt', () => {
  it('icbrt(0) = 0', () => expect(icbrt(0n)).toBe(0n));
  it('icbrt(26) = 2 (floor)', () => expect(icbrt(26n)).toBe(2n));
  it('icbrt(27) = 3', () => expect(icbrt(27n)).toBe(3n));
  it('icbrt(1e18) = 1e6', () => expect(icbrt(10n ** 18n)).toBe(10n ** 6n));
  it('icbrt of non-cube is floor', () => {
    const n = 10n ** 30n + 1n;
    const r = icbrt(n);
    expect(r * r * r <= n).toBe(true);
    expect((r + 1n) * (r + 1n) * (r + 1n) > n).toBe(true);
  });
});

describe('num-util: randMod', () => {
  it('randMod(1) always returns 0', () => {
    for (let i = 0; i < 100; i++) expect(randMod(1)).toBe(0);
  });
  it('randMod(q) stays in [0, q) for small q', () => {
    for (let i = 0; i < 1000; i++) {
      const v = randMod(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
  it('throws on non-positive q', () => {
    expect(() => randMod(0)).toThrow();
    expect(() => randMod(-5)).toThrow();
  });
  it('randMod distribution is approximately uniform for q=7', () => {
    // Weak smoke test — catches gross modulo bias, not subtle skew.
    const counts = new Array(7).fill(0);
    const N = 70_000;
    for (let i = 0; i < N; i++) counts[randMod(7)]++;
    // Each bucket should be within ±15% of N/7 (very loose bound)
    const expected = N / 7;
    for (const c of counts) {
      expect(Math.abs(c - expected) / expected).toBeLessThan(0.15);
    }
  });
});

describe('num-util: randModBig', () => {
  it('stays in [0, q) for small bigint q', () => {
    for (let i = 0; i < 200; i++) {
      const v = randModBig(257n);
      expect(v >= 0n && v < 257n).toBe(true);
    }
  });
  it('stays in [0, q) for large q', () => {
    const q = (1n << 200n) + 17n;
    for (let i = 0; i < 50; i++) {
      const v = randModBig(q);
      expect(v >= 0n && v < q).toBe(true);
    }
  });
  it('randModBig(1n) = 0n', () => expect(randModBig(1n)).toBe(0n));
  it('throws on non-positive', () => expect(() => randModBig(0n)).toThrow());
});

describe('num-util: randBytes', () => {
  it('returns a Uint8Array of the requested length', () => {
    const b = randBytes(32);
    expect(b).toBeInstanceOf(Uint8Array);
    expect(b.length).toBe(32);
  });
  it('successive calls differ (sanity)', () => {
    const a = randBytes(16);
    const b = randBytes(16);
    // Astronomically unlikely to collide on real CSPRNG
    expect(Array.from(a).join(',')).not.toBe(Array.from(b).join(','));
  });
});
