import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, FormulaBox, ComputationRow } from '@/components/StepCard';
import { lll2D, type LLLResult, type Vec2 } from '@/lib/lll-math';

const PRESETS: { name: string; b1: Vec2; b2: Vec2 }[] = [
  { name: 'Nearly parallel', b1: { x: 1, y: 0 }, b2: { x: 12, y: 1 } },
  { name: 'Skewed', b1: { x: 3, y: 1 }, b2: { x: 2, y: 5 } },
  { name: 'Already reduced', b1: { x: 1, y: 0 }, b2: { x: 0, y: 1 } },
  { name: 'Large ratio', b1: { x: 1, y: 0 }, b2: { x: 50, y: 1 } },
];

function norm(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function LatticeViz({ original, reduced }: { original: [Vec2, Vec2]; reduced: [Vec2, Vec2] }) {
  // Auto-scale based on max magnitude
  const allVecs = [...original, ...reduced];
  const maxCoord = Math.max(...allVecs.map(v => Math.max(Math.abs(v.x), Math.abs(v.y))), 1);
  const padding = maxCoord * 0.2;
  const extent = maxCoord + padding;

  const w = 320;
  const h = 320;
  const scale = (w / 2 - 20) / extent;
  const cx = w / 2;
  const cy = h / 2;

  function toSvg(v: Vec2): { x: number; y: number } {
    return { x: cx + v.x * scale, y: cy - v.y * scale };
  }

  // Generate lattice points from reduced basis within bounds
  const latticePoints: Vec2[] = [];
  const range = Math.ceil(extent * 2 / Math.max(norm(reduced[0]), norm(reduced[1]), 0.5));
  const cap = Math.min(range, 15);
  for (let i = -cap; i <= cap; i++) {
    for (let j = -cap; j <= cap; j++) {
      const pt = { x: i * reduced[0].x + j * reduced[1].x, y: i * reduced[0].y + j * reduced[1].y };
      if (Math.abs(pt.x) <= extent && Math.abs(pt.y) <= extent) {
        latticePoints.push(pt);
      }
    }
  }

  const arrowId = 'arrowhead';
  const arrowIdGreen = 'arrowhead-green';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto border rounded-lg bg-card">
      <defs>
        <marker id={arrowId} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="hsl(0, 70%, 60%)" />
        </marker>
        <marker id={arrowIdGreen} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="hsl(140, 70%, 45%)" />
        </marker>
      </defs>

      {/* Grid lines */}
      <line x1={0} y1={cy} x2={w} y2={cy} stroke="currentColor" opacity={0.1} />
      <line x1={cx} y1={0} x2={cx} y2={h} stroke="currentColor" opacity={0.1} />

      {/* Lattice points */}
      {latticePoints.map((pt, i) => {
        const s = toSvg(pt);
        return <circle key={i} cx={s.x} cy={s.y} r={2} fill="currentColor" opacity={0.2} />;
      })}

      {/* Original basis (red dashed) */}
      {original.map((v, i) => {
        const end = toSvg(v);
        return (
          <line key={`orig-${i}`} x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="hsl(0, 70%, 60%)" strokeWidth={2} strokeDasharray="6 3"
            markerEnd={`url(#${arrowId})`} opacity={0.7} />
        );
      })}

      {/* Reduced basis (green solid) */}
      {reduced.map((v, i) => {
        const end = toSvg(v);
        return (
          <line key={`red-${i}`} x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="hsl(140, 70%, 45%)" strokeWidth={2}
            markerEnd={`url(#${arrowIdGreen})`} />
        );
      })}

      {/* Origin */}
      <circle cx={cx} cy={cy} r={3} fill="currentColor" />

      {/* Legend */}
      <line x1={10} y1={h - 30} x2={30} y2={h - 30} stroke="hsl(0, 70%, 60%)" strokeWidth={2} strokeDasharray="6 3" />
      <text x={34} y={h - 26} fontSize={10} fill="currentColor">Original</text>
      <line x1={10} y1={h - 14} x2={30} y2={h - 14} stroke="hsl(140, 70%, 45%)" strokeWidth={2} />
      <text x={34} y={h - 10} fontSize={10} fill="currentColor">Reduced</text>
    </svg>
  );
}

export function LLLVisualization() {
  const [b1x, setB1x] = useState('1');
  const [b1y, setB1y] = useState('0');
  const [b2x, setB2x] = useState('12');
  const [b2y, setB2y] = useState('1');
  const [delta, setDelta] = useState('0.75');
  const [result, setResult] = useState<LLLResult | null>(null);
  const [error, setError] = useState('');

  function loadPreset(p: typeof PRESETS[0]) {
    setB1x(p.b1.x.toString());
    setB1y(p.b1.y.toString());
    setB2x(p.b2.x.toString());
    setB2y(p.b2.y.toString());
    setResult(null);
  }

  function doReduce() {
    setError('');
    const x1 = parseFloat(b1x), y1 = parseFloat(b1y);
    const x2 = parseFloat(b2x), y2 = parseFloat(b2y);
    const d = parseFloat(delta);
    if ([x1, y1, x2, y2, d].some(isNaN)) { setError('Enter valid numbers'); return; }
    if (d <= 0.25 || d > 1) { setError('Delta must be in (0.25, 1]'); return; }
    if (x1 === 0 && y1 === 0) { setError('b1 cannot be the zero vector'); return; }
    if (x2 === 0 && y2 === 0) { setError('b2 cannot be the zero vector'); return; }
    const det = x1 * y2 - y1 * x2;
    if (det === 0) { setError('Vectors are linearly dependent (det = 0)'); return; }
    try {
      setResult(lll2D({ x: x1, y: y1 }, { x: x2, y: y2 }, d));
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">LLL Lattice Reduction (2D)</CardTitle>
          <CardDescription>
            The Lenstra-Lenstra-Lovász algorithm finds short, nearly orthogonal lattice bases.
            Foundational for lattice-based cryptanalysis (breaking knapsack ciphers, NTRU attacks)
            and for understanding post-quantum schemes (LWE, RLWE).
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Input Basis" status="active">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRESETS.map((p, i) => (
            <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => loadPreset(p)}>
              {p.name}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div><Label className="text-xs">b1.x</Label><Input value={b1x} onChange={e => setB1x(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">b1.y</Label><Input value={b1y} onChange={e => setB1y(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">b2.x</Label><Input value={b2x} onChange={e => setB2x(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">b2.y</Label><Input value={b2y} onChange={e => setB2y(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">δ (Lovász)</Label><Input value={delta} onChange={e => setDelta(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doReduce} className="w-full">Run LLL Reduction</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {result && (
        <>
          <StepCard step={2} title="Visualization" status="complete">
            <LatticeViz original={result.original} reduced={result.reduced} />
          </StepCard>

          <StepCard step={3} title="Results" status="complete">
            <FormulaBox>
              <ComputationRow label="Original b1" value={`(${result.original[0].x}, ${result.original[0].y})  ||b1|| = ${norm(result.original[0]).toFixed(3)}`} />
              <ComputationRow label="Original b2" value={`(${result.original[1].x}, ${result.original[1].y})  ||b2|| = ${norm(result.original[1]).toFixed(3)}`} />
              <ComputationRow label="Reduced b1" value={`(${result.reduced[0].x}, ${result.reduced[0].y})  ||b1|| = ${norm(result.reduced[0]).toFixed(3)}`} highlight />
              <ComputationRow label="Reduced b2" value={`(${result.reduced[1].x}, ${result.reduced[1].y})  ||b2|| = ${norm(result.reduced[1]).toFixed(3)}`} highlight />
              <ComputationRow label="Defect before" value={result.orthogonalityDefectBefore.toFixed(4)} />
              <ComputationRow label="Defect after" value={result.orthogonalityDefectAfter.toFixed(4)} />
            </FormulaBox>
            <p className="text-xs text-muted-foreground mt-2">
              Orthogonality defect = ||b1||·||b2|| / |det(B)|. A defect of 1.0 means perfectly orthogonal.
              LLL guarantees a defect ≤ 2^((n-1)/2) = √2 for n=2.
            </p>
          </StepCard>

          <StepCard step={4} title="Algorithm Steps" status="complete">
            <div className="space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className={`rounded border p-2 text-xs ${step.type === 'swap' ? 'bg-yellow-500/10 border-yellow-500/30' : step.type === 'size-reduce' ? 'bg-blue-500/10 border-blue-500/30' : step.type === 'done' ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {step.type === 'init' ? 'INIT' : step.type === 'size-reduce' ? 'SIZE-REDUCE' : step.type === 'swap' ? 'SWAP' : 'DONE'}
                    </Badge>
                    <span className="font-mono">{step.description}</span>
                  </div>
                  <div className="font-mono text-muted-foreground">
                    b1=({step.b1.x}, {step.b1.y}) b2=({step.b2.x}, {step.b2.y})
                  </div>
                </div>
              ))}
            </div>
          </StepCard>
        </>
      )}
    </div>
  );
}
