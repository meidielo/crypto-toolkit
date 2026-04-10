import { describe, it, expect } from 'vitest';
import { parseBigInt } from '../lib/parse';

describe('parseBigInt', () => {
  it('parses plain decimal', () => {
    expect(parseBigInt('42')).toBe(42n);
  });
  it('parses negative decimal', () => {
    expect(parseBigInt('-123')).toBe(-123n);
  });
  it('parses hex (0x prefix passes through to BigInt)', () => {
    expect(parseBigInt('0xff')).toBe(255n);
  });
  it('strips thousands-separator commas', () => {
    expect(parseBigInt('1,234,567')).toBe(1_234_567n);
  });
  it('strips underscores', () => {
    expect(parseBigInt('1_000_000')).toBe(1_000_000n);
  });
  it('strips internal whitespace', () => {
    expect(parseBigInt('12 345 678')).toBe(12_345_678n);
  });
  it('returns null on empty / whitespace-only', () => {
    expect(parseBigInt('')).toBeNull();
    expect(parseBigInt('   ')).toBeNull();
  });
  it('returns null on garbage', () => {
    expect(parseBigInt('hello')).toBeNull();
    expect(parseBigInt('12abc')).toBeNull();
  });
  it('returns null on oversized input (>2000 chars)', () => {
    expect(parseBigInt('1'.repeat(2001))).toBeNull();
  });
  it('returns null on bare minus sign', () => {
    expect(parseBigInt('-')).toBeNull();
  });
});
