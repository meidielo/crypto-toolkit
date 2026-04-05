// Elliptic Curve Math over F_p using BigInt
// Curve: y² = x³ + Ax + B (mod p)

export interface ECPoint {
  x: bigint;
  y: bigint;
}

export const INFINITY: ECPoint = { x: 0n, y: 0n };

export function isInfinity(P: ECPoint): boolean {
  return P.x === 0n && P.y === 0n;
}

export function mod(a: bigint, p: bigint): bigint {
  return ((a % p) + p) % p;
}

export function modInverse(a: bigint, p: bigint): bigint {
  a = mod(a, p);
  if (a === 0n) throw new Error('No inverse for 0');
  // Extended Euclidean Algorithm
  let [old_r, r] = [a, p];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error(`No inverse: gcd(${a}, ${p}) = ${old_r}`);
  return mod(old_s, p);
}

export function modPow(base: bigint, exp: bigint, p: bigint): bigint {
  base = mod(base, p);
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = mod(result * base, p);
    base = mod(base * base, p);
    exp >>= 1n;
  }
  return result;
}

export function isOnCurve(P: ECPoint, A: bigint, B: bigint, p: bigint): boolean {
  if (isInfinity(P)) return true;
  const lhs = mod(P.y * P.y, p);
  const rhs = mod(P.x * P.x * P.x + A * P.x + B, p);
  return lhs === rhs;
}

export function discriminant(A: bigint, B: bigint, p: bigint): bigint {
  return mod(4n * A * A * A + 27n * B * B, p);
}

export function pointAdd(P: ECPoint, Q: ECPoint, A: bigint, p: bigint): ECPoint {
  if (isInfinity(P)) return Q;
  if (isInfinity(Q)) return P;

  if (P.x === Q.x) {
    if (mod(P.y + Q.y, p) === 0n) return INFINITY; // P + (-P) = O
    return pointDouble(P, A, p); // P === Q
  }

  const dx = mod(Q.x - P.x, p);
  const dy = mod(Q.y - P.y, p);
  const lambda = mod(dy * modInverse(dx, p), p);
  const x3 = mod(lambda * lambda - P.x - Q.x, p);
  const y3 = mod(lambda * (P.x - x3) - P.y, p);
  return { x: x3, y: y3 };
}

export function pointDouble(P: ECPoint, A: bigint, p: bigint): ECPoint {
  if (isInfinity(P)) return INFINITY;
  if (P.y === 0n) return INFINITY;

  const num = mod(3n * P.x * P.x + A, p);
  const den = mod(2n * P.y, p);
  const lambda = mod(num * modInverse(den, p), p);
  const x3 = mod(lambda * lambda - 2n * P.x, p);
  const y3 = mod(lambda * (P.x - x3) - P.y, p);
  return { x: x3, y: y3 };
}

export function scalarMultiply(k: bigint, P: ECPoint, A: bigint, p: bigint): ECPoint {
  if (k === 0n || isInfinity(P)) return INFINITY;
  if (k < 0n) {
    k = -k;
    P = { x: P.x, y: mod(-P.y, p) };
  }

  let result = INFINITY;
  let addend = { ...P };

  while (k > 0n) {
    if (k & 1n) {
      result = pointAdd(result, addend, A, p);
    }
    addend = pointDouble(addend, A, p);
    k >>= 1n;
  }
  return result;
}

export interface ScalarMultiplyStep {
  bit: number;
  k_binary: string;
  current: ECPoint;
  description: string;
}

export function scalarMultiplyWithSteps(
  k: bigint,
  P: ECPoint,
  A: bigint,
  p: bigint
): { result: ECPoint; steps: ScalarMultiplyStep[] } {
  const steps: ScalarMultiplyStep[] = [];
  if (k === 0n || isInfinity(P)) return { result: INFINITY, steps };

  const negative = k < 0n;
  if (negative) {
    k = -k;
    P = { x: P.x, y: mod(-P.y, p) };
  }

  const binary = k.toString(2);
  let result = INFINITY;
  let addend = { ...P };

  for (let i = binary.length - 1; i >= 0; i--) {
    const bit = parseInt(binary[i]);
    if (bit === 1) {
      result = pointAdd(result, addend, A, p);
      steps.push({
        bit: binary.length - 1 - i,
        k_binary: binary,
        current: { ...result },
        description: `Bit ${binary.length - 1 - i} = 1: Add 2^${binary.length - 1 - i}P`,
      });
    }
    if (i > 0) {
      addend = pointDouble(addend, A, p);
    }
  }
  return { result, steps };
}

export function getPointOrder(P: ECPoint, A: bigint, _B: bigint, p: bigint): bigint {
  if (isInfinity(P)) return 1n;
  let Q = { ...P };
  let order = 1n;
  const limit = p + 1n + 2n * sqrt(p); // Hasse bound
  while (order <= limit) {
    if (isInfinity(Q)) return order;
    Q = pointAdd(Q, P, A, p);
    order++;
  }
  return 0n; // shouldn't happen for valid curves
}

function sqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('sqrt of negative');
  if (n === 0n) return 0n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

export function getAllPoints(A: bigint, B: bigint, p: bigint): ECPoint[] {
  if (p > 10007n) throw new Error('Prime too large to enumerate all points (max 10007)');
  const points: ECPoint[] = [];
  for (let x = 0n; x < p; x++) {
    const rhs = mod(x * x * x + A * x + B, p);
    for (let y = 0n; y < p; y++) {
      if (mod(y * y, p) === rhs) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

// Faster: use Euler criterion + Tonelli-Shanks
export function getAllPointsFast(A: bigint, B: bigint, p: bigint): ECPoint[] {
  if (p > 100003n) throw new Error('Prime too large to enumerate (max ~100000)');
  const points: ECPoint[] = [];
  for (let x = 0n; x < p; x++) {
    const rhs = mod(x * x * x + A * x + B, p);
    if (rhs === 0n) {
      points.push({ x, y: 0n });
      continue;
    }
    // Euler criterion: rhs^((p-1)/2) === 1 mod p means QR
    if (modPow(rhs, (p - 1n) / 2n, p) === 1n) {
      const y = tonelliShanks(rhs, p);
      if (y !== null) {
        points.push({ x, y });
        const y2 = mod(-y, p);
        if (y2 !== y) points.push({ x, y: y2 });
      }
    }
  }
  points.sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : a.y < b.y ? -1 : a.y > b.y ? 1 : 0));
  return points;
}

export function tonelliShanks(n: bigint, p: bigint): bigint | null {
  if (modPow(n, (p - 1n) / 2n, p) !== 1n) return null;
  if (p % 4n === 3n) return modPow(n, (p + 1n) / 4n, p);

  let s = 0n;
  let q = p - 1n;
  while (q % 2n === 0n) {
    s++;
    q /= 2n;
  }

  let z = 2n;
  let zAttempts = 0;
  while (modPow(z, (p - 1n) / 2n, p) !== p - 1n) {
    if (++zAttempts > 1000) throw new Error('tonelliShanks: failed to find quadratic non-residue (is p prime?)');
    z++;
  }

  let m = s;
  let c = modPow(z, q, p);
  let t = modPow(n, q, p);
  let r = modPow(n, (q + 1n) / 2n, p);

  let steps = 0;
  while (true) {
    if (++steps > 1000) throw new Error('tonelliShanks: exceeded 1000 iterations (is p prime?)');
    if (t === 1n) return r;
    let i = 1n;
    let tmp = mod(t * t, p);
    let innerSteps = 0;
    while (tmp !== 1n) {
      if (++innerSteps > 1000) throw new Error('tonelliShanks: inner loop exceeded 1000 iterations');
      tmp = mod(tmp * tmp, p);
      i++;
    }
    const b = modPow(c, modPow(2n, m - i - 1n, p - 1n), p);
    m = i;
    c = mod(b * b, p);
    t = mod(t * c, p);
    r = mod(r * b, p);
  }
}

// Preset curves
export const PRESET_CURVES = [
  { name: 'Tiny (A=1, B=1, p=23)', A: 1n, B: 1n, p: 23n },
  { name: 'Small (A=2, B=3, p=97)', A: 2n, B: 3n, p: 97n },
  { name: 'Medium (A=0, B=7, p=67)', A: 0n, B: 7n, p: 67n },
  { name: 'secp256k1 (Bitcoin)', A: 0n, B: 7n, p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn },
  { name: 'P-192 (NIST)', A: -3n, B: 0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1n, p: 0xfffffffffffffffffffffffffffffffeffffffffffffffffn },
  { name: 'P-256 (NIST)', A: -3n, B: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn, p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn },
];

// Known standard curves for contradiction detection
const KNOWN_CURVES: { name: string; A: bigint; B: bigint; p: bigint }[] = [
  { name: 'secp256k1', A: 0n, B: 7n, p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn },
  { name: 'P-192 (NIST)', A: -3n, B: 0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1n, p: 0xfffffffffffffffffffffffffffffffeffffffffffffffffn },
  { name: 'P-256 (NIST)', A: -3n, B: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn, p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn },
];

export function identifyCurve(A: bigint, B: bigint, p: bigint): string | null {
  // Normalize A to positive mod p for comparison
  const normA = ((A % p) + p) % p;
  for (const curve of KNOWN_CURVES) {
    const cNormA = ((curve.A % curve.p) + curve.p) % curve.p;
    if (normA === cNormA && B === curve.B && p === curve.p) return curve.name;
  }
  return null;
}

export interface PointAdditionSteps {
  P: ECPoint;
  Q: ECPoint;
  lambda: bigint | null;
  lambdaNumerator: bigint | null;
  lambdaDenominator: bigint | null;
  result: ECPoint;
  case: 'infinity_P' | 'infinity_Q' | 'inverse' | 'double' | 'add';
  description: string;
}

export function pointAddWithSteps(
  P: ECPoint,
  Q: ECPoint,
  A: bigint,
  p: bigint
): PointAdditionSteps {
  if (isInfinity(P)) {
    return { P, Q, lambda: null, lambdaNumerator: null, lambdaDenominator: null, result: Q, case: 'infinity_P', description: 'P is the point at infinity, so P + Q = Q' };
  }
  if (isInfinity(Q)) {
    return { P, Q, lambda: null, lambdaNumerator: null, lambdaDenominator: null, result: P, case: 'infinity_Q', description: 'Q is the point at infinity, so P + Q = P' };
  }
  if (P.x === Q.x && mod(P.y + Q.y, p) === 0n) {
    return { P, Q, lambda: null, lambdaNumerator: null, lambdaDenominator: null, result: INFINITY, case: 'inverse', description: 'P and Q are inverses (P.x = Q.x, P.y = -Q.y), so P + Q = O (infinity)' };
  }
  if (P.x === Q.x && P.y === Q.y) {
    const num = mod(3n * P.x * P.x + A, p);
    const den = mod(2n * P.y, p);
    const lambda = mod(num * modInverse(den, p), p);
    const x3 = mod(lambda * lambda - 2n * P.x, p);
    const y3 = mod(lambda * (P.x - x3) - P.y, p);
    return { P, Q, lambda, lambdaNumerator: num, lambdaDenominator: den, result: { x: x3, y: y3 }, case: 'double', description: 'P = Q, using point doubling formula: λ = (3x² + A) / (2y)' };
  }

  const num = mod(Q.y - P.y, p);
  const den = mod(Q.x - P.x, p);
  const lambda = mod(num * modInverse(den, p), p);
  const x3 = mod(lambda * lambda - P.x - Q.x, p);
  const y3 = mod(lambda * (P.x - x3) - P.y, p);
  return { P, Q, lambda, lambdaNumerator: num, lambdaDenominator: den, result: { x: x3, y: y3 }, case: 'add', description: 'Standard point addition: λ = (y₂ - y₁) / (x₂ - x₁)' };
}
