// Shared BigInt parsing with input length guard.
// Tolerates user-pasted numbers containing thousands separators (commas,
// underscores) and internal whitespace — common when copying from calculators,
// papers, or spreadsheets. BigInt() itself rejects these, so we strip them
// before parsing. Hex (0x…), binary (0b…), and octal (0o…) prefixes are
// passed through unchanged because BigInt() accepts them natively.
const MAX_BIGINT_CHARS = 2000;

export function parseBigInt(s: string): bigint | null {
  try {
    if (typeof s !== 'string') return null;
    // Strip commas, underscores, and whitespace inside the number.
    const cleaned = s.replace(/[\s,_]/g, '').trim();
    if (!cleaned || cleaned.length > MAX_BIGINT_CHARS) return null;
    if (cleaned.startsWith('-')) {
      const rest = cleaned.slice(1);
      if (!rest) return null;
      return -BigInt(rest);
    }
    return BigInt(cleaned);
  } catch {
    return null;
  }
}
