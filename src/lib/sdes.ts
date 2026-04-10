// Simplified DES (S-DES) — 8-bit block, 10-bit key, 2 Feistel rounds
// Educational implementation following Schaefer (1996) with step tracking.
// Used for demonstrating meet-in-the-middle attacks on double encryption.

export interface SDESStep {
  phase: string;
  input: string;   // binary representation
  output: string;
  detail?: string;
}

// ---------- Permutation tables (1-indexed per spec) ----------

const P10 = [3, 5, 2, 7, 4, 10, 1, 9, 8, 6];
const P8  = [6, 3, 7, 4, 8, 5, 10, 9];
const IP  = [2, 6, 3, 1, 4, 8, 5, 7];
const IP_INV = [4, 1, 3, 5, 7, 2, 8, 6];
const EP  = [4, 1, 2, 3, 2, 3, 4, 1];
const P4  = [2, 4, 3, 1];

const S0 = [
  [1, 0, 3, 2],
  [3, 2, 1, 0],
  [0, 2, 1, 3],
  [3, 1, 3, 2],
];

const S1 = [
  [0, 1, 2, 3],
  [2, 0, 1, 3],
  [3, 0, 1, 0],
  [2, 1, 0, 3],
];

// ---------- Bit helpers ----------

function bits(val: number, width: number): number[] {
  const out: number[] = [];
  for (let i = width - 1; i >= 0; i--) out.push((val >> i) & 1);
  return out;
}

function fromBits(arr: number[]): number {
  let v = 0;
  for (const b of arr) v = (v << 1) | b;
  return v;
}

function permute(input: number[], table: number[]): number[] {
  return table.map(i => input[i - 1]);
}

function leftShift5(half: number[], shifts: number): number[] {
  const out = [...half];
  for (let i = 0; i < shifts; i++) out.push(out.shift()!);
  return out;
}

function xorBits(a: number[], b: number[]): number[] {
  return a.map((v, i) => v ^ b[i]);
}

function toBin(val: number, width: number): string {
  return val.toString(2).padStart(width, '0');
}

// ---------- Key schedule ----------

export function sdesSubkeys(key: number): { k1: number; k2: number; steps: SDESStep[] } {
  const steps: SDESStep[] = [];
  const keyBits = bits(key, 10);

  const p10 = permute(keyBits, P10);
  steps.push({ phase: 'P10', input: toBin(key, 10), output: p10.join('') });

  const left1 = leftShift5(p10.slice(0, 5), 1);
  const right1 = leftShift5(p10.slice(5), 1);
  const shifted1 = [...left1, ...right1];
  steps.push({ phase: 'LS-1', input: p10.join(''), output: shifted1.join('') });

  const k1Bits = permute(shifted1, P8);
  const k1 = fromBits(k1Bits);
  steps.push({ phase: 'P8 → K1', input: shifted1.join(''), output: toBin(k1, 8) });

  const left2 = leftShift5(left1, 2);
  const right2 = leftShift5(right1, 2);
  const shifted2 = [...left2, ...right2];
  steps.push({ phase: 'LS-2', input: shifted1.join(''), output: shifted2.join('') });

  const k2Bits = permute(shifted2, P8);
  const k2 = fromBits(k2Bits);
  steps.push({ phase: 'P8 → K2', input: shifted2.join(''), output: toBin(k2, 8) });

  return { k1, k2, steps };
}

// ---------- Feistel function ----------

function sboxLookup(box: number[][], input4: number[]): number[] {
  const row = (input4[0] << 1) | input4[3];
  const col = (input4[1] << 1) | input4[2];
  return bits(box[row][col], 2);
}

function feistel(right4: number[], subkey: number[]): number[] {
  const expanded = permute(right4, EP);          // 4 → 8 bits
  const xored = xorBits(expanded, subkey);       // XOR with subkey
  const s0out = sboxLookup(S0, xored.slice(0, 4));
  const s1out = sboxLookup(S1, xored.slice(4));
  return permute([...s0out, ...s1out], P4);      // P4 → 4 bits
}

// ---------- Encrypt / Decrypt ----------

export function sdesEncrypt(plaintext: number, key: number): { ciphertext: number; steps: SDESStep[] } {
  const { k1, k2, steps } = sdesSubkeys(key);
  const ptBits = bits(plaintext, 8);

  const ip = permute(ptBits, IP);
  steps.push({ phase: 'IP', input: toBin(plaintext, 8), output: ip.join('') });

  // Round 1 with K1
  let left = ip.slice(0, 4);
  let right = ip.slice(4);
  const f1 = feistel(right, bits(k1, 8));
  const newRight = xorBits(left, f1);
  steps.push({
    phase: 'Round 1',
    input: `L=${left.join('')} R=${right.join('')}`,
    output: `L=${right.join('')} R=${newRight.join('')}`,
    detail: `f(R, K1) = ${f1.join('')}`,
  });

  // Swap
  left = right;
  right = newRight;

  // Round 2 with K2
  const f2 = feistel(right, bits(k2, 8));
  const finalRight = xorBits(left, f2);
  steps.push({
    phase: 'Round 2',
    input: `L=${left.join('')} R=${right.join('')}`,
    output: `L=${right.join('')} R=${finalRight.join('')}`,
    detail: `f(R, K2) = ${f2.join('')}`,
  });

  // S-DES: IP → fK1 → SW → fK2 → IP⁻¹  (no final swap)
  // After SW: left=R0, right=L0 XOR f(R0,K1) = newRight
  // After fK2: output_left = left XOR f(right, K2) = finalRight
  //            output_right = right = newRight (unchanged)
  const ipInv = permute([...finalRight, ...newRight], IP_INV);
  const ciphertext = fromBits(ipInv);
  steps.push({ phase: 'IP⁻¹', input: [...finalRight, ...newRight].join(''), output: toBin(ciphertext, 8) });

  return { ciphertext, steps };
}

export function sdesDecrypt(ciphertext: number, key: number): { plaintext: number; steps: SDESStep[] } {
  // Decryption = same structure but subkeys applied in reverse order (K2 first, then K1)
  const { k1, k2, steps } = sdesSubkeys(key);
  const ctBits = bits(ciphertext, 8);

  const ip = permute(ctBits, IP);
  steps.push({ phase: 'IP', input: toBin(ciphertext, 8), output: ip.join('') });

  // Round 1 with K2 (reversed)
  let left = ip.slice(0, 4);
  let right = ip.slice(4);
  const f1 = feistel(right, bits(k2, 8));
  const newRight = xorBits(left, f1);
  steps.push({
    phase: 'Round 1 (K2)',
    input: `L=${left.join('')} R=${right.join('')}`,
    output: `L=${right.join('')} R=${newRight.join('')}`,
    detail: `f(R, K2) = ${f1.join('')}`,
  });

  // Swap
  left = right;
  right = newRight;

  // Round 2 with K1 (reversed)
  const f2 = feistel(right, bits(k1, 8));
  const finalRight = xorBits(left, f2);
  steps.push({
    phase: 'Round 2 (K1)',
    input: `L=${left.join('')} R=${right.join('')}`,
    output: `L=${right.join('')} R=${finalRight.join('')}`,
    detail: `f(R, K1) = ${f2.join('')}`,
  });

  const preOutput = [...finalRight, ...newRight];
  const ipInv = permute(preOutput, IP_INV);
  const plaintext = fromBits(ipInv);
  steps.push({ phase: 'IP⁻¹', input: preOutput.join(''), output: toBin(plaintext, 8) });

  return { plaintext, steps };
}

// ---------- Meet-in-the-Middle ----------

export interface MITMMatch {
  k1: number;
  k2: number;
  intermediate: number;
}

export interface MITMResult {
  matches: MITMMatch[];
  encryptTableSize: number;
  decryptChecks: number;
  bruteForceSpace: number;   // 2^20
  mitmSpace: number;         // 2 * 2^10
}

/**
 * Meet-in-the-middle attack on double S-DES encryption.
 * Given a known plaintext-ciphertext pair (P, C) where C = Enc(K2, Enc(K1, P)),
 * recovers all valid (K1, K2) pairs.
 */
export function meetInTheMiddle(plaintext: number, ciphertext: number): MITMResult {
  // Forward: encrypt P with all 1024 possible K1 values
  const encTable = new Map<number, number[]>(); // intermediate → [K1 values]
  for (let k1 = 0; k1 < 1024; k1++) {
    const mid = sdesEncrypt(plaintext, k1).ciphertext;
    const existing = encTable.get(mid);
    if (existing) existing.push(k1);
    else encTable.set(mid, [k1]);
  }

  // Backward: decrypt C with all 1024 possible K2 values, check for match
  const matches: MITMMatch[] = [];
  let decryptChecks = 0;
  for (let k2 = 0; k2 < 1024; k2++) {
    const mid = sdesDecrypt(ciphertext, k2).plaintext;
    decryptChecks++;
    const k1List = encTable.get(mid);
    if (k1List) {
      for (const k1 of k1List) {
        matches.push({ k1, k2, intermediate: mid });
      }
    }
  }

  return {
    matches,
    encryptTableSize: 1024,
    decryptChecks,
    bruteForceSpace: 1 << 20,  // 1,048,576
    mitmSpace: 2048,
  };
}
