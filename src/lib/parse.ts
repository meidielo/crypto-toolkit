// Shared BigInt parsing with input length guard
const MAX_BIGINT_CHARS = 2000;

export function parseBigInt(s: string): bigint | null {
  try {
    const trimmed = s.trim();
    if (!trimmed || trimmed.length > MAX_BIGINT_CHARS) return null;
    if (trimmed.startsWith('-')) return -BigInt(trimmed.slice(1));
    return BigInt(trimmed);
  } catch {
    return null;
  }
}
