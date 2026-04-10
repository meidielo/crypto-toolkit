import { describe, it, expect } from 'vitest';
import { lll2D, Vec2 } from '../lib/lll-math';

function det(b1: Vec2, b2: Vec2): number {
  return Math.abs(b1.x * b2.y - b1.y * b2.x);
}

function norm(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

describe('LLL 2D lattice reduction', () => {
  it('reduces a nearly parallel basis', () => {
    const result = lll2D({ x: 1, y: 0 }, { x: 12, y: 1 });
    // Reduced basis should be short and nearly orthogonal
    const [r1, r2] = result.reduced;
    expect(norm(r1)).toBeLessThanOrEqual(norm(result.original[0]) + norm(result.original[1]));
    expect(result.orthogonalityDefectAfter).toBeLessThanOrEqual(result.orthogonalityDefectBefore + 0.001);
    // Determinant preserved (same lattice)
    expect(det(r1, r2)).toBeCloseTo(det(result.original[0], result.original[1]), 8);
  });

  it('leaves an already reduced basis unchanged', () => {
    const result = lll2D({ x: 1, y: 0 }, { x: 0, y: 1 });
    expect(result.reduced[0]).toEqual({ x: 1, y: 0 });
    expect(result.reduced[1]).toEqual({ x: 0, y: 1 });
    expect(result.orthogonalityDefectAfter).toBeCloseTo(1.0, 8);
  });

  it('reduces a skewed basis', () => {
    const result = lll2D({ x: 3, y: 1 }, { x: 2, y: 5 });
    const [r1, r2] = result.reduced;
    // Determinant preserved
    expect(det(r1, r2)).toBeCloseTo(det({ x: 3, y: 1 }, { x: 2, y: 5 }), 8);
    // Reduced vectors are shorter or equal
    const origMaxNorm = Math.max(norm({ x: 3, y: 1 }), norm({ x: 2, y: 5 }));
    expect(norm(r1)).toBeLessThanOrEqual(origMaxNorm + 0.001);
  });

  it('produces steps including init and done', () => {
    const result = lll2D({ x: 1, y: 0 }, { x: 12, y: 1 });
    expect(result.steps[0].type).toBe('init');
    expect(result.steps[result.steps.length - 1].type).toBe('done');
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('handles negative coordinates', () => {
    const result = lll2D({ x: -4, y: 3 }, { x: 7, y: -2 });
    const [r1, r2] = result.reduced;
    expect(det(r1, r2)).toBeCloseTo(det({ x: -4, y: 3 }, { x: 7, y: -2 }), 8);
  });

  it('respects delta parameter', () => {
    const loose = lll2D({ x: 1, y: 0 }, { x: 50, y: 1 }, 0.5);
    const strict = lll2D({ x: 1, y: 0 }, { x: 50, y: 1 }, 0.99);
    // Strict delta may produce better orthogonality
    expect(strict.orthogonalityDefectAfter).toBeLessThanOrEqual(loose.orthogonalityDefectAfter + 0.1);
    // Both preserve determinant
    expect(det(loose.reduced[0], loose.reduced[1])).toBeCloseTo(1, 8);
    expect(det(strict.reduced[0], strict.reduced[1])).toBeCloseTo(1, 8);
  });
});
