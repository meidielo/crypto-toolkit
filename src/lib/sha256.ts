// Custom SHA-256 with exposed internal state for Hash Length Extension Attack
// Implements FIPS 180-4 — allows resuming from arbitrary internal state

const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const H0: number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

function rotr(x: number, n: number): number { return ((x >>> n) | (x << (32 - n))) >>> 0; }
function ch(x: number, y: number, z: number): number { return ((x & y) ^ (~x & z)) >>> 0; }
function maj(x: number, y: number, z: number): number { return ((x & y) ^ (x & z) ^ (y & z)) >>> 0; }
function sigma0(x: number): number { return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0; }
function sigma1(x: number): number { return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0; }
function gamma0(x: number): number { return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0; }
function gamma1(x: number): number { return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0; }

function compress(state: number[], block: Uint8Array): number[] {
  // Parse block into 16 32-bit words
  const W: number[] = new Array(64);
  for (let i = 0; i < 16; i++) {
    W[i] = (block[i * 4] << 24) | (block[i * 4 + 1] << 16) | (block[i * 4 + 2] << 8) | block[i * 4 + 3];
  }
  for (let i = 16; i < 64; i++) {
    W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) >>> 0;
  }

  let [a, b, c, d, e, f, g, h] = state;

  for (let i = 0; i < 64; i++) {
    const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + W[i]) >>> 0;
    const t2 = (sigma0(a) + maj(a, b, c)) >>> 0;
    h = g; g = f; f = e;
    e = (d + t1) >>> 0;
    d = c; c = b; b = a;
    a = (t1 + t2) >>> 0;
  }

  return [
    (state[0] + a) >>> 0, (state[1] + b) >>> 0, (state[2] + c) >>> 0, (state[3] + d) >>> 0,
    (state[4] + e) >>> 0, (state[5] + f) >>> 0, (state[6] + g) >>> 0, (state[7] + h) >>> 0,
  ];
}

export class SHA256 {
  private state: number[];
  private buffer: Uint8Array;
  private bufferLen: number;
  private totalLen: number; // total bytes processed (excluding buffer)

  /**
   * Create a SHA-256 hasher.
   * @param initialState Optional 8-word state to resume from (for length extension)
   * @param initialLen Total bytes already processed (for correct padding)
   */
  constructor(initialState?: number[], initialLen?: number) {
    this.state = initialState ? [...initialState] : [...H0];
    this.buffer = new Uint8Array(64);
    this.bufferLen = 0;
    this.totalLen = initialLen ?? 0;
  }

  update(data: Uint8Array): SHA256 {
    let offset = 0;

    // Fill buffer if partially filled
    if (this.bufferLen > 0) {
      const needed = 64 - this.bufferLen;
      const toCopy = Math.min(needed, data.length);
      this.buffer.set(data.subarray(0, toCopy), this.bufferLen);
      this.bufferLen += toCopy;
      offset = toCopy;

      if (this.bufferLen === 64) {
        this.state = compress(this.state, this.buffer);
        this.totalLen += 64;
        this.bufferLen = 0;
      }
    }

    // Process complete blocks
    while (offset + 64 <= data.length) {
      this.state = compress(this.state, data.subarray(offset, offset + 64));
      this.totalLen += 64;
      offset += 64;
    }

    // Buffer remaining bytes
    if (offset < data.length) {
      this.buffer.set(data.subarray(offset), 0);
      this.bufferLen = data.length - offset;
    }

    return this;
  }

  /** Get a copy of the current internal state (h0..h7) */
  getState(): number[] {
    return [...this.state];
  }

  /** Get total bytes processed so far (including buffer) */
  getLength(): number {
    return this.totalLen + this.bufferLen;
  }

  /** Finalize and return hex digest */
  digest(): string {
    const totalBits = BigInt(this.totalLen + this.bufferLen) * 8n;

    // Padding: 0x80, then zeros, then 64-bit big-endian bit length
    const padBlock = new Uint8Array(128); // max 2 blocks needed
    let padLen = 0;

    // Copy remaining buffer
    padBlock.set(this.buffer.subarray(0, this.bufferLen), 0);
    padLen = this.bufferLen;

    // Append 0x80
    padBlock[padLen++] = 0x80;

    // Pad to 56 mod 64
    let targetLen = 56;
    if (padLen > 56) targetLen = 120; // need second block
    while (padLen < targetLen) padBlock[padLen++] = 0;

    // Append 64-bit big-endian bit length
    for (let i = 7; i >= 0; i--) {
      padBlock[padLen++] = Number((totalBits >> BigInt(i * 8)) & 0xffn);
    }

    // Process padding blocks
    let state = this.state;
    for (let i = 0; i < padLen; i += 64) {
      state = compress(state, padBlock.subarray(i, i + 64));
    }

    // Convert state to hex
    return state.map(w => w.toString(16).padStart(8, '0')).join('');
  }

  /** Convenience: hash a string and return hex */
  static hash(input: string): string {
    return new SHA256().update(new TextEncoder().encode(input)).digest();
  }

  /** Convenience: hash bytes and return hex */
  static hashBytes(data: Uint8Array): string {
    return new SHA256().update(data).digest();
  }

  /** Parse a hex digest into 8 state words (for resuming) */
  static parseState(hex: string): number[] {
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error('parseState requires exactly 64 hex characters');
    }
    const state: number[] = [];
    for (let i = 0; i < 64; i += 8) {
      state.push(parseInt(hex.substring(i, i + 8), 16));
    }
    return state;
  }
}

/** Compute Merkle-Damgard padding bytes for a given message length */
export function mdPaddingBytes(msgLen: number): Uint8Array {
  const bitLen = BigInt(msgLen * 8);
  const padNeeded = (55 - (msgLen % 64) + 64) % 64 + 1; // 1 for 0x80 byte
  const padding = new Uint8Array(padNeeded + 8);
  padding[0] = 0x80;
  // Zeros are already 0
  // 8-byte big-endian bit length at end
  for (let i = 7; i >= 0; i--) {
    padding[padNeeded + 7 - i] = Number((bitLen >> BigInt(i * 8)) & 0xffn);
  }
  return padding;
}
