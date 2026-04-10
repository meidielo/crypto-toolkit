// 2D LLL lattice basis reduction (Lenstra-Lenstra-Lovász)
// Educational implementation with step tracking for visualization.

export interface Vec2 {
  x: number;
  y: number;
}

export interface LLLStep {
  type: 'init' | 'size-reduce' | 'swap' | 'done';
  description: string;
  b1: Vec2;
  b2: Vec2;
  mu: number;
  b1StarNorm2: number;
  b2StarNorm2: number;
}

export interface LLLResult {
  original: [Vec2, Vec2];
  reduced: [Vec2, Vec2];
  steps: LLLStep[];
  orthogonalityDefectBefore: number;
  orthogonalityDefectAfter: number;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function norm2(v: Vec2): number {
  return dot(v, v);
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function orthogonalityDefect(b1: Vec2, b2: Vec2): number {
  // ||b1|| * ||b2|| / |det(B)|   — 1.0 is perfectly orthogonal
  const det = Math.abs(b1.x * b2.y - b1.y * b2.x);
  if (det === 0) return Infinity;
  return (Math.sqrt(norm2(b1)) * Math.sqrt(norm2(b2))) / det;
}

/**
 * Run 2D LLL reduction on basis {b1, b2}.
 * @param b1 First basis vector
 * @param b2 Second basis vector
 * @param delta Lovász parameter in (0.25, 1]. Default 0.75.
 */
export function lll2D(
  b1: Vec2,
  b2: Vec2,
  delta: number = 0.75
): LLLResult {
  const original: [Vec2, Vec2] = [{ ...b1 }, { ...b2 }];
  const steps: LLLStep[] = [];

  // Gram-Schmidt: b1* = b1, mu = <b2, b1*> / <b1*, b1*>, b2* = b2 - mu*b1*
  let b1n2 = norm2(b1);
  let mu = b1n2 === 0 ? 0 : dot(b2, b1) / b1n2;
  let b2Star = sub(b2, scale(b1, mu));
  let b2sn2 = norm2(b2Star);

  steps.push({
    type: 'init',
    description: `Initial basis. mu = ${mu.toFixed(4)}, ||b1*||² = ${b1n2.toFixed(2)}, ||b2*||² = ${b2sn2.toFixed(2)}`,
    b1: { ...b1 }, b2: { ...b2 }, mu, b1StarNorm2: b1n2, b2StarNorm2: b2sn2,
  });

  const MAX_ITER = 100;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Size-reduce: if |mu| > 0.5, subtract round(mu)*b1 from b2
    if (Math.abs(mu) > 0.5) {
      const r = Math.round(mu);
      b2 = sub(b2, scale(b1, r));
      // Recompute Gram-Schmidt
      b1n2 = norm2(b1);
      mu = b1n2 === 0 ? 0 : dot(b2, b1) / b1n2;
      b2Star = sub(b2, scale(b1, mu));
      b2sn2 = norm2(b2Star);
      steps.push({
        type: 'size-reduce',
        description: `Size-reduce: b2 ← b2 − ${r}·b1. New mu = ${mu.toFixed(4)}`,
        b1: { ...b1 }, b2: { ...b2 }, mu, b1StarNorm2: b1n2, b2StarNorm2: b2sn2,
      });
    }

    // Lovász condition: ||b2*||² >= (delta - mu²) * ||b1*||²
    if (b2sn2 >= (delta - mu * mu) * b1n2) {
      steps.push({
        type: 'done',
        description: `Lovász satisfied: ||b2*||² = ${b2sn2.toFixed(2)} ≥ ${((delta - mu * mu) * b1n2).toFixed(2)} = (δ − μ²)·||b1*||²`,
        b1: { ...b1 }, b2: { ...b2 }, mu, b1StarNorm2: b1n2, b2StarNorm2: b2sn2,
      });
      break;
    }

    // Swap b1 and b2
    [b1, b2] = [b2, b1];
    // Recompute Gram-Schmidt
    b1n2 = norm2(b1);
    mu = b1n2 === 0 ? 0 : dot(b2, b1) / b1n2;
    b2Star = sub(b2, scale(b1, mu));
    b2sn2 = norm2(b2Star);
    steps.push({
      type: 'swap',
      description: `Lovász failed → swap. New mu = ${mu.toFixed(4)}`,
      b1: { ...b1 }, b2: { ...b2 }, mu, b1StarNorm2: b1n2, b2StarNorm2: b2sn2,
    });
  }

  return {
    original,
    reduced: [{ ...b1 }, { ...b2 }],
    steps,
    orthogonalityDefectBefore: orthogonalityDefect(original[0], original[1]),
    orthogonalityDefectAfter: orthogonalityDefect(b1, b2),
  };
}
