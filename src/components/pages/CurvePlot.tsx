import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAllPointsFast, PRESET_CURVES, discriminant, type ECPoint } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { parseBigInt } from '@/lib/parse';

export function CurvePlot() {
  const [aStr, setAStr] = useState('1');
  const [bStr, setBStr] = useState('1');
  const [pStr, setPStr] = useState('23');
  const [highlight, setHighlight] = useState<ECPoint | null>(null);

  const A = parseBigInt(aStr);
  const B = parseBigInt(bStr);
  const p = parseBigInt(pStr);

  const points = useMemo(() => {
    if (A === null || B === null || p === null) return null;
    if (p < 3n || !isPrime(p)) return null;
    if (discriminant(A, B, p) === 0n) return null;
    if (p > 200n) return null;
    try { return getAllPointsFast(A, B, p); } catch { return null; }
  }, [A, B, p]);

  function loadPreset(idx: number) {
    const c = PRESET_CURVES[idx];
    setAStr(c.A.toString());
    setBStr(c.B.toString());
    setPStr(c.p.toString());
  }

  const pNum = Number(p || 0);
  const cellSize = pNum <= 30 ? 18 : pNum <= 60 ? 10 : pNum <= 100 ? 7 : 5;

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Elliptic Curve Scatter Plot (F_p)</CardTitle>
          <CardDescription>
            Visualizes all points on y² = x³ + Ax + B over a finite field. Unlike smooth curves over the reals,
            EC points over F_p appear as scattered dots — yet they still form an abelian group.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CURVES.slice(0, 3).map((c, i) => (
              <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => loadPreset(i)}>{c.name}</Badge>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">A</Label><Input value={aStr} onChange={e => setAStr(e.target.value)} className="font-mono" /></div>
            <div><Label className="text-xs">B</Label><Input value={bStr} onChange={e => setBStr(e.target.value)} className="font-mono" /></div>
            <div><Label className="text-xs">p (prime, max 200)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          </div>

          {points && p && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {points.length} points + O | y² = x³ {A !== null && A >= 0n ? `+ ${A}x` : `- ${A !== null ? (-A).toString() : ''}x`} {B !== null && B >= 0n ? `+ ${B}` : `- ${B !== null ? (-B).toString() : ''}`} (mod {p.toString()})
              </p>

              {/* Scatter plot */}
              <div className="overflow-auto border rounded-lg bg-background p-2" style={{ maxHeight: 500 }}>
                <div
                  className="relative"
                  style={{ width: pNum * cellSize + cellSize, height: pNum * cellSize + cellSize }}
                >
                  {/* Grid lines (every 5) */}
                  {pNum <= 100 && Array.from({ length: Math.floor(pNum / 5) + 1 }, (_, i) => i * 5).map(v => (
                    <div key={`gx-${v}`}>
                      <div className="absolute border-l border-border/20" style={{ left: v * cellSize, top: 0, height: pNum * cellSize }} />
                      <div className="absolute border-t border-border/20" style={{ top: (pNum - v) * cellSize, left: 0, width: pNum * cellSize }} />
                    </div>
                  ))}

                  {/* Axis labels */}
                  <div className="absolute text-[8px] text-muted-foreground" style={{ left: -2, top: pNum * cellSize + 4 }}>0</div>
                  <div className="absolute text-[8px] text-muted-foreground" style={{ left: (pNum - 1) * cellSize, top: pNum * cellSize + 4 }}>{pNum - 1}</div>
                  <div className="absolute text-[8px] text-muted-foreground" style={{ left: -14, top: 0 }}>{pNum - 1}</div>

                  {/* Points — rendered as buttons so they are keyboard-focusable
                      and announce their coordinates to assistive tech. */}
                  {points.map((pt, i) => {
                    const x = Number(pt.x);
                    const y = Number(pt.y);
                    const isHighlighted = highlight && highlight.x === pt.x && highlight.y === pt.y;
                    const label = `Point (${pt.x}, ${pt.y})`;
                    return (
                      <button
                        type="button"
                        key={i}
                        className={`absolute rounded-full cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isHighlighted ? 'bg-red-500 ring-2 ring-red-500/50 z-10' : 'bg-primary/70 hover:bg-primary'
                        }`}
                        style={{
                          width: Math.max(cellSize - 2, 3),
                          height: Math.max(cellSize - 2, 3),
                          left: x * cellSize + 1,
                          top: (pNum - 1 - y) * cellSize + 1,
                        }}
                        onClick={() => setHighlight(pt)}
                        aria-label={label}
                        aria-pressed={isHighlighted ? true : false}
                        title={`(${pt.x}, ${pt.y})`}
                      />
                    );
                  })}
                </div>
              </div>

              {highlight && (
                <p className="text-xs font-mono text-center">
                  Selected: ({highlight.x.toString()}, {highlight.y.toString()})
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                X axis: 0..{pNum - 1} | Y axis: 0..{pNum - 1} (bottom to top)
              </p>
            </div>
          )}

          {p && p > 200n && (
            <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400">
              p must be ≤ 200 for visualization (too many pixels for larger primes)
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
