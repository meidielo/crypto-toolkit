import { describe, it, expect } from 'vitest';
import { sdesEncrypt, sdesDecrypt, sdesSubkeys, meetInTheMiddle } from '../lib/sdes';

describe('S-DES', () => {
  it('generates two 8-bit subkeys from a 10-bit key', () => {
    const { k1, k2 } = sdesSubkeys(0b1010000010);
    expect(k1).toBeGreaterThanOrEqual(0);
    expect(k1).toBeLessThan(256);
    expect(k2).toBeGreaterThanOrEqual(0);
    expect(k2).toBeLessThan(256);
  });

  it('encrypt then decrypt is identity for multiple keys', () => {
    const keys = [0, 1, 0b1010000010, 0b1111111111, 0b0101010101, 512, 1023];
    for (const key of keys) {
      for (let pt = 0; pt < 256; pt += 17) { // sample plaintexts
        const { ciphertext } = sdesEncrypt(pt, key);
        const { plaintext } = sdesDecrypt(ciphertext, key);
        expect(plaintext).toBe(pt);
      }
    }
  });

  it('encrypt then decrypt is identity exhaustively for one key', () => {
    const key = 0b1010000010;
    for (let pt = 0; pt < 256; pt++) {
      const { ciphertext } = sdesEncrypt(pt, key);
      const { plaintext } = sdesDecrypt(ciphertext, key);
      expect(plaintext).toBe(pt);
    }
  });

  it('encryption is not identity (ciphertext != plaintext for most inputs)', () => {
    const key = 0b1010000010;
    let different = 0;
    for (let pt = 0; pt < 256; pt++) {
      if (sdesEncrypt(pt, key).ciphertext !== pt) different++;
    }
    // At least 200 out of 256 should differ (a cipher that maps everything to itself is broken)
    expect(different).toBeGreaterThan(200);
  });

  it('different keys produce different ciphertexts', () => {
    const pt = 0b10101010;
    const c1 = sdesEncrypt(pt, 0b1010000010).ciphertext;
    const c2 = sdesEncrypt(pt, 0b0101111101).ciphertext;
    expect(c1).not.toBe(c2);
  });

  it('produces step-by-step trace', () => {
    const { steps } = sdesEncrypt(0b10101010, 0b1010000010);
    const phases = steps.map(s => s.phase);
    expect(phases).toContain('P10');
    expect(phases).toContain('P8 → K1');
    expect(phases).toContain('IP');
    expect(phases).toContain('Round 1');
    expect(phases).toContain('Round 2');
    expect(phases).toContain('IP⁻¹');
  });
});

describe('Meet-in-the-Middle on double S-DES', () => {
  it('recovers key pair for a known plaintext-ciphertext pair', () => {
    const k1 = 0b1010000010;
    const k2 = 0b0101111101;
    const pt = 0b10101010;
    // Double encrypt: C = Enc(K2, Enc(K1, P))
    const mid = sdesEncrypt(pt, k1).ciphertext;
    const ct = sdesEncrypt(mid, k2).ciphertext;

    const result = meetInTheMiddle(pt, ct);
    // Should find at least one match that includes our key pair
    const found = result.matches.some(m => m.k1 === k1 && m.k2 === k2);
    expect(found).toBe(true);
    // Verify every match is actually valid
    for (const m of result.matches) {
      const mid2 = sdesEncrypt(pt, m.k1).ciphertext;
      const ct2 = sdesEncrypt(mid2, m.k2).ciphertext;
      expect(ct2).toBe(ct);
    }
  });

  it('MITM uses 2*2^10 operations, not 2^20', () => {
    const result = meetInTheMiddle(0, 0);
    expect(result.encryptTableSize).toBe(1024);
    expect(result.decryptChecks).toBe(1024);
    expect(result.mitmSpace).toBe(2048);
    expect(result.bruteForceSpace).toBe(1 << 20);
  });

  it('finds multiple key pairs (collisions expected)', () => {
    // With 2^20 key pairs mapping 256 possible values, collisions are guaranteed
    // by pigeonhole: on average 2^20/256 = 4096 pairs per mapping
    const result = meetInTheMiddle(42, 42);
    expect(result.matches.length).toBeGreaterThan(1);
  });
});
