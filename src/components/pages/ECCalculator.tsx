import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  PRESET_CURVES,
  discriminant,
  isOnCurve,
  identifyCurve,
  pointAddWithSteps,
  scalarMultiplyWithSteps,
  getAllPointsFast,
  getPointOrder,
  isInfinity,
  type ECPoint,
  type PointAdditionSteps,
  type ScalarMultiplyStep,
} from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try {
    const trimmed = s.trim();
    if (!trimmed || trimmed.length > 2000) return null;
    if (trimmed.startsWith('-')) return -BigInt(trimmed.slice(1));
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function pointStr(P: ECPoint): string {
  if (isInfinity(P)) return 'O (infinity)';
  return `(${P.x}, ${P.y})`;
}

export function ECCalculator() {
  // Curve params
  const [aStr, setAStr] = useState('1');
  const [bStr, setBStr] = useState('1');
  const [pStr, setPStr] = useState('23');
  const [presetIdx, setPresetIdx] = useState(0);

  // Point addition
  const [px1, setPx1] = useState('');
  const [py1, setPy1] = useState('');
  const [px2, setPx2] = useState('');
  const [py2, setPy2] = useState('');
  const [addResult, setAddResult] = useState<PointAdditionSteps | null>(null);
  const [addError, setAddError] = useState('');

  // Scalar multiplication
  const [sk, setSk] = useState('');
  const [spx, setSpx] = useState('');
  const [spy, setSpy] = useState('');
  const [mulResult, setMulResult] = useState<{ result: ECPoint; steps: ScalarMultiplyStep[] } | null>(null);
  const [mulError, setMulError] = useState('');

  const A = parseBigInt(aStr);
  const B = parseBigInt(bStr);
  const p = parseBigInt(pStr);

  const curveValid = useMemo(() => {
    if (A === null || B === null || p === null) return { valid: false, reason: 'Enter all parameters' };
    if (p < 3n) return { valid: false, reason: 'p must be >= 3' };
    if (!isPrime(p)) return { valid: false, reason: 'p must be prime' };
    const disc = discriminant(A, B, p);
    if (disc === 0n) return { valid: false, reason: 'Singular curve (4A³ + 27B² ≡ 0 mod p)' };
    return { valid: true, reason: '', disc };
  }, [A, B, p]);

  // Curve contradiction detection
  const curveContradiction = useMemo(() => {
    if (!curveValid.valid || A === null || B === null || p === null) return null;
    const identified = identifyCurve(A, B, p);
    const selectedPreset = PRESET_CURVES[presetIdx];
    // Check if params match a DIFFERENT known curve than the selected preset
    const presetMatches = selectedPreset &&
      ((A % p + p) % p) === ((selectedPreset.A % selectedPreset.p + selectedPreset.p) % selectedPreset.p) &&
      B === selectedPreset.B && p === selectedPreset.p;
    if (identified && !presetMatches && presetIdx >= 3) {
      return { type: 'contradiction' as const, message: `These parameters define ${identified}, not ${selectedPreset?.name.split(' (')[0]}` };
    }
    if (identified) return { type: 'identified' as const, message: `Standard curve: ${identified}` };
    if (presetIdx >= 3 && !identified) return { type: 'custom' as const, message: 'Custom parameters (not a recognized standard curve)' };
    return null;
  }, [A, B, p, curveValid.valid, presetIdx]);

  const allPoints = useMemo(() => {
    if (!curveValid.valid || A === null || B === null || p === null) return null;
    if (p > 1009n) return null;
    try {
      return getAllPointsFast(A, B, p);
    } catch {
      return null;
    }
  }, [A, B, p, curveValid.valid]);

  function loadPreset(idx: number) {
    setPresetIdx(idx);
    const c = PRESET_CURVES[idx];
    setAStr(c.A.toString());
    setBStr(c.B.toString());
    setPStr(c.p.toString());
    setAddResult(null);
    setMulResult(null);
  }

  function doPointAdd() {
    setAddError('');
    setAddResult(null);
    if (A === null || B === null || p === null || !curveValid.valid) {
      setAddError('Invalid curve parameters');
      return;
    }
    const x1 = parseBigInt(px1), y1 = parseBigInt(py1);
    const x2 = parseBigInt(px2), y2 = parseBigInt(py2);
    if (x1 === null || y1 === null || x2 === null || y2 === null) {
      setAddError('Enter all point coordinates');
      return;
    }
    const P: ECPoint = { x: x1, y: y1 };
    const Q: ECPoint = { x: x2, y: y2 };
    if (!isOnCurve(P, A, B, p)) { setAddError(`P = ${pointStr(P)} is not on the curve`); return; }
    if (!isOnCurve(Q, A, B, p)) { setAddError(`Q = ${pointStr(Q)} is not on the curve`); return; }
    try {
      setAddResult(pointAddWithSteps(P, Q, A, p));
    } catch (e) {
      setAddError(String(e));
    }
  }

  function doScalarMul() {
    setMulError('');
    setMulResult(null);
    if (A === null || B === null || p === null || !curveValid.valid) {
      setMulError('Invalid curve parameters');
      return;
    }
    const k = parseBigInt(sk), x = parseBigInt(spx), y = parseBigInt(spy);
    if (k === null || x === null || y === null) {
      setMulError('Enter scalar k and point coordinates');
      return;
    }
    const P: ECPoint = { x, y };
    if (!isOnCurve(P, A, B, p)) { setMulError(`P = ${pointStr(P)} is not on the curve`); return; }
    try {
      setMulResult(scalarMultiplyWithSteps(k, P, A, p));
    } catch (e) {
      setMulError(String(e));
    }
  }

  return (
    <div className="space-y-6">
      {/* Curve Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Curve Parameters</CardTitle>
          <CardDescription>
            E(F<sub>p</sub>): y² = x³ + Ax + B (mod p)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CURVES.map((c, i) => (
              <Badge
                key={i}
                variant={presetIdx === i ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => loadPreset(i)}
              >
                {c.name}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ec-a">A</Label>
              <Input id="ec-a" value={aStr} onChange={e => setAStr(e.target.value)} placeholder="0" className="font-mono" />
            </div>
            <div>
              <Label htmlFor="ec-b">B</Label>
              <Input id="ec-b" value={bStr} onChange={e => setBStr(e.target.value)} placeholder="7" className="font-mono" />
            </div>
            <div>
              <Label htmlFor="ec-p">p (prime)</Label>
              <Input id="ec-p" value={pStr} onChange={e => setPStr(e.target.value)} placeholder="23" className="font-mono" />
            </div>
          </div>
          {curveValid.valid ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">Valid</Badge>
              <span className="text-muted-foreground font-mono">
                y² = x³ {A !== null && A >= 0n ? `+ ${A}x` : `- ${A !== null ? (-A).toString() : ''}x`} {B !== null && B >= 0n ? `+ ${B}` : `- ${B !== null ? (-B).toString() : ''}`} (mod {p?.toString()})
              </span>
              {allPoints && (
                <span className="text-muted-foreground">
                  | {allPoints.length} points + O
                </span>
              )}
            </div>
          ) : (
            <Badge variant="destructive">{curveValid.reason}</Badge>
          )}
          {curveContradiction?.type === 'contradiction' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span><strong>Parameter Contradiction:</strong> {curveContradiction.message}</span>
            </div>
          )}
          {curveContradiction?.type === 'custom' && (
            <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10">
              {curveContradiction.message}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="add">Point Addition</TabsTrigger>
          <TabsTrigger value="mul">Scalar Multiply</TabsTrigger>
          <TabsTrigger value="points">Points Table</TabsTrigger>
        </TabsList>

        {/* Point Addition */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">P + Q = R</CardTitle>
              <CardDescription>Add two points on the curve</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Point P</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="px1" className="text-xs text-muted-foreground">x₁</Label>
                      <Input id="px1" value={px1} onChange={e => setPx1(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                    <div>
                      <Label htmlFor="py1" className="text-xs text-muted-foreground">y₁</Label>
                      <Input id="py1" value={py1} onChange={e => setPy1(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Point Q</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="px2" className="text-xs text-muted-foreground">x₂</Label>
                      <Input id="px2" value={px2} onChange={e => setPx2(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                    <div>
                      <Label htmlFor="py2" className="text-xs text-muted-foreground">y₂</Label>
                      <Input id="py2" value={py2} onChange={e => setPy2(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                  </div>
                </div>
              </div>
              {allPoints && allPoints.length <= 200 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1 self-center">Quick pick:</span>
                  {allPoints.slice(0, 20).map((pt, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer text-xs font-mono"
                      onClick={() => {
                        if (!px1 && !py1) { setPx1(pt.x.toString()); setPy1(pt.y.toString()); }
                        else { setPx2(pt.x.toString()); setPy2(pt.y.toString()); }
                      }}
                    >
                      ({pt.x.toString()},{pt.y.toString()})
                    </Badge>
                  ))}
                </div>
              )}
              <Button onClick={doPointAdd} className="w-full">Calculate P + Q</Button>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              {addResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>Result</Badge>
                    <span className="font-mono font-semibold text-lg">{pointStr(addResult.result)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{addResult.description}</p>
                  {addResult.lambda !== null && (
                    <div className="text-sm font-mono space-y-1">
                      <p>λ numerator = {addResult.lambdaNumerator?.toString()}</p>
                      <p>λ denominator = {addResult.lambdaDenominator?.toString()}</p>
                      <p>λ = {addResult.lambda.toString()}</p>
                      <p>x₃ = λ² - x₁ - x₂ = {addResult.result.x.toString()}</p>
                      <p>y₃ = λ(x₁ - x₃) - y₁ = {addResult.result.y.toString()}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scalar Multiplication */}
        <TabsContent value="mul">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">k × P = S</CardTitle>
              <CardDescription>Multiply a point by a scalar using double-and-add</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="sk">k (scalar)</Label>
                  <Input id="sk" value={sk} onChange={e => setSk(e.target.value)} placeholder="5" className="font-mono" />
                </div>
                <div>
                  <Label htmlFor="spx">P.x</Label>
                  <Input id="spx" value={spx} onChange={e => setSpx(e.target.value)} placeholder="0" className="font-mono" />
                </div>
                <div>
                  <Label htmlFor="spy">P.y</Label>
                  <Input id="spy" value={spy} onChange={e => setSpy(e.target.value)} placeholder="0" className="font-mono" />
                </div>
              </div>
              <Button onClick={doScalarMul} className="w-full">Calculate kP</Button>
              {mulError && <p className="text-sm text-destructive">{mulError}</p>}
              {mulResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>Result</Badge>
                    <span className="font-mono font-semibold text-lg">{pointStr(mulResult.result)}</span>
                  </div>
                  {mulResult.steps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Double-and-add steps:</p>
                      <div className="space-y-1">
                        {mulResult.steps.map((step, i) => (
                          <div key={i} className="text-sm font-mono flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                            <span>{step.description}</span>
                            <span className="text-muted-foreground">→ {pointStr(step.current)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points Table */}
        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Points on the Curve</CardTitle>
              <CardDescription>
                {allPoints
                  ? `${allPoints.length} points + point at infinity (O)`
                  : p && p > 1009n
                  ? 'Prime too large to enumerate (max p ≤ 1009)'
                  : 'Configure a valid curve first'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allPoints && (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">#</th>
                        <th className="text-left py-2 px-3 font-medium">x</th>
                        <th className="text-left py-2 px-3 font-medium">y</th>
                        <th className="text-left py-2 px-3 font-medium">Order</th>
                        <th className="text-left py-2 px-3 font-medium">Generator?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPoints.map((pt, i) => {
                        const order = p! <= 97n ? getPointOrder(pt, A!, B!, p!) : 0n;
                        const isGen = order > 0n && allPoints && BigInt(allPoints.length + 1) === order;
                        return (
                          <tr
                            key={i}
                            className={`border-b hover:bg-muted/50 cursor-pointer ${isGen ? 'bg-primary/5' : ''}`}
                            onClick={() => {
                              setPx1(pt.x.toString());
                              setPy1(pt.y.toString());
                            }}
                          >
                            <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-1.5 px-3 font-mono">{pt.x.toString()}</td>
                            <td className="py-1.5 px-3 font-mono">{pt.y.toString()}</td>
                            <td className="py-1.5 px-3 font-mono">{order > 0n ? order.toString() : '—'}</td>
                            <td className="py-1.5 px-3">
                              {isGen && <Badge variant="default" className="text-xs">Generator</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
