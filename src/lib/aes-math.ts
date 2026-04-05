// AES-128 Math Engine for educational single-round visualization
// Implements FIPS 197 (AES) operations on 4x4 byte state matrices

// AES S-Box (SubBytes lookup table)
export const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

// Rcon (round constants for key expansion)
const RCON: number[] = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

// State is a 4x4 array of bytes (column-major as per AES spec)
// state[col][row] — AES uses column-major ordering
export type State = number[][];

// Parse 16 hex bytes into 4x4 state (column-major)
export function hexToState(hex: string): State {
  const clean = hex.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(clean.substring(i, i + 2), 16));
  }
  // AES fills column-major: byte 0 → [0][0], byte 1 → [0][1], byte 4 → [1][0], etc.
  const state: State = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let i = 0; i < 16; i++) {
    state[Math.floor(i / 4)][i % 4] = bytes[i];
  }
  return state;
}

export function stateToHex(state: State): string {
  const bytes: string[] = [];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      bytes.push(state[col][row].toString(16).padStart(2, '0'));
    }
  }
  return bytes.join('');
}

export function copyState(state: State): State {
  return state.map(col => [...col]);
}

// ============= SubBytes =============
export function subBytes(state: State): State {
  const result = copyState(state);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      result[c][r] = SBOX[state[c][r]];
    }
  }
  return result;
}

// ============= ShiftRows =============
// Row 0: no shift, Row 1: left 1, Row 2: left 2, Row 3: left 3
export function shiftRows(state: State): State {
  const result = copyState(state);
  for (let r = 1; r < 4; r++) {
    const row = [state[0][r], state[1][r], state[2][r], state[3][r]];
    for (let c = 0; c < 4; c++) {
      result[c][r] = row[(c + r) % 4];
    }
  }
  return result;
}

// ============= MixColumns =============
// GF(2^8) multiplication with irreducible polynomial x^8 + x^4 + x^3 + x + 1 (0x11b)
export function gfMul(a: number, b: number): number {
  let result = 0;
  let aa = a;
  let bb = b;
  for (let i = 0; i < 8; i++) {
    if (bb & 1) result ^= aa;
    const hiBit = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (hiBit) aa ^= 0x1b; // reduce by x^8+x^4+x^3+x+1
    bb >>= 1;
  }
  return result;
}

// MixColumns fixed matrix
export const MIX_MATRIX = [
  [2, 3, 1, 1],
  [1, 2, 3, 1],
  [1, 1, 2, 3],
  [3, 1, 1, 2],
];

export function mixColumns(state: State): State {
  const result = copyState(state);
  for (let c = 0; c < 4; c++) {
    const col = [state[c][0], state[c][1], state[c][2], state[c][3]];
    for (let r = 0; r < 4; r++) {
      result[c][r] =
        gfMul(MIX_MATRIX[r][0], col[0]) ^
        gfMul(MIX_MATRIX[r][1], col[1]) ^
        gfMul(MIX_MATRIX[r][2], col[2]) ^
        gfMul(MIX_MATRIX[r][3], col[3]);
    }
  }
  return result;
}

// Get detailed MixColumns computation for a single column
export function mixColumnDetail(col: number[]): { row: number; terms: { coeff: number; input: number; product: number }[]; result: number }[] {
  const details: { row: number; terms: { coeff: number; input: number; product: number }[]; result: number }[] = [];
  for (let r = 0; r < 4; r++) {
    const terms = MIX_MATRIX[r].map((coeff, i) => ({
      coeff,
      input: col[i],
      product: gfMul(coeff, col[i]),
    }));
    const result = terms.reduce((acc, t) => acc ^ t.product, 0);
    details.push({ row: r, terms, result });
  }
  return details;
}

// ============= AddRoundKey =============
export function addRoundKey(state: State, roundKey: State): State {
  const result = copyState(state);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      result[c][r] = state[c][r] ^ roundKey[c][r];
    }
  }
  return result;
}

// ============= Key Expansion =============
export function keyExpansion(key: number[]): State[] {
  // AES-128: 16-byte key → 11 round keys (4 words each)
  const w: number[][] = []; // each w[i] is a 4-byte word

  // First 4 words are the key itself
  for (let i = 0; i < 4; i++) {
    w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
  }

  // Generate remaining 40 words
  for (let i = 4; i < 44; i++) {
    let temp = [...w[i - 1]];
    if (i % 4 === 0) {
      // RotWord + SubWord + Rcon
      temp = [SBOX[temp[1]], SBOX[temp[2]], SBOX[temp[3]], SBOX[temp[0]]];
      temp[0] ^= RCON[(i / 4) - 1];
    }
    w.push(w[i - 4].map((b, j) => b ^ temp[j]));
  }

  // Convert words to round key states
  const roundKeys: State[] = [];
  for (let round = 0; round < 11; round++) {
    const state: State = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        state[c][r] = w[round * 4 + c][r];
      }
    }
    roundKeys.push(state);
  }
  return roundKeys;
}

// Full single round (for educational step-by-step)
export interface AESRoundResult {
  input: State;
  afterSubBytes: State;
  afterShiftRows: State;
  afterMixColumns: State;
  roundKey: State;
  afterAddRoundKey: State;
}

export function aesRound(state: State, roundKey: State): AESRoundResult {
  const afterSubBytes = subBytes(state);
  const afterShiftRows = shiftRows(afterSubBytes);
  const afterMixColumns = mixColumns(afterShiftRows);
  const afterAddRoundKey = addRoundKey(afterMixColumns, roundKey);
  return {
    input: copyState(state),
    afterSubBytes,
    afterShiftRows,
    afterMixColumns,
    roundKey: copyState(roundKey),
    afterAddRoundKey,
  };
}
