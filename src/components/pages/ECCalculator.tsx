import { parseBigInt } from '@/lib/parse';
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
  montgomeryLadder,
  babyGiantStep,
  getAllPointsFast,
  getPointOrder,
  pointStr,
  type ECPoint,
  type PointAdditionSteps,
  type ScalarMultiplyStep,
  type MontgomeryStep,
} from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';

// Cap on how many points we render in the "All Points" table. At p=1009 the
// group has ~1000 elements, and rendering that many rows (each with nested
// cells and a per-row order computation) stalls the main thread. 300 is
// enough to see the structure and still scroll, without freezing the page.
const POINTS_TABLE_CAP = 300;

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

  // Montgomery ladder
  const [mk, setMk] = useState('');
  const [mpx, setMpx] = useState('');
  const [mpy, setMpy] = useState('');
  const [montResult, setMontResult] = useState<{ result: ECPoint; steps: MontgomeryStep[] } | null>(null);
  const [montError, setMontError] = useState('');

  // BSGS discrete log
  const [bgGx, setBgGx] = useState('');
  const [bgGy, setBgGy] = useState('');
  const [bgQx, setBgQx] = useState('');
  const [bgQy, setBgQy] = useState('');
  const [bsgsResult, setBsgsResult] = useState<{ k: bigint | null; babySteps: number; giantSteps: number; totalOps: number; order: bigint } | null>(null);
  const [bsgsError, setBsgsError] = useState('');

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

  function doMontgomery() {
    setMontError('');
    setMontResult(null);
    if (A === null || B === null || p === null || !curveValid.valid) {
      setMontError('Invalid curve parameters');
      return;
    }
    const k = parseBigInt(mk), x = parseBigInt(mpx), y = parseBigInt(mpy);
    if (k === null || x === null || y === null) {
      setMontError('Enter scalar k and point coordinates');
      return;
    }
    const P: ECPoint = { x, y };
    if (!isOnCurve(P, A, B, p)) { setMontError(`P = ${pointStr(P)} is not on the curve`); return; }
    try {
      setMontResult(montgomeryLadder(k, P, A, p));
    } catch (e) {
      setMontError(String(e));
    }
  }

  function doBSGS() {
    setBsgsError('');
    setBsgsResult(null);
    if (A === null || B === null || p === null || !curveValid.valid) {
      setBsgsError('Invalid curve parameters');
      return;
    }
    const gx = parseBigInt(bgGx), gy = parseBigInt(bgGy);
    const qx = parseBigInt(bgQx), qy = parseBigInt(bgQy);
    if (gx === null || gy === null || qx === null || qy === null) {
      setBsgsError('Enter base point G and target point Q');
      return;
    }
    const G: ECPoint = { x: gx, y: gy };
    const Q: ECPoint = { x: qx, y: qy };
    if (!isOnCurve(G, A, B, p)) { setBsgsError(`G = ${pointStr(G)} is not on the curve`); return; }
    if (!isOnCurve(Q, A, B, p)) { setBsgsError(`Q = ${pointStr(Q)} is not on the curve`); return; }
    try {
      const order = getPointOrder(G, A, B, p);
      const result = babyGiantStep(G, Q, A, p, order);
      setBsgsResult({ ...result, order });
    } catch (e) {
      setBsgsError(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Elliptic Curve Calculator</CardTitle>
          <CardDescription>
            Explore elliptic curve arithmetic over finite fields. Points on the curve form a group — the foundation of modern public-key cryptography.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">Public-key cryptography needs a mathematical "one-way function" — easy to compute forward, practically impossible to reverse. RSA uses integer factoring; elliptic curves offer the same security with much smaller keys (256-bit EC ≈ 3072-bit RSA).</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">An elliptic curve y² = x³ + Ax + B over a prime field F<sub>p</sub> defines a set of points that form an abelian group under a geometric "addition" rule. Given a point P and scalar k, computing kP (repeated addition) is fast via double-and-add. But given P and Q = kP, finding k is the Elliptic Curve Discrete Logarithm Problem (ECDLP) — believed to require O(√n) time with the best known algorithms.</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Key concepts</summary>
          <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li><strong>Point addition</strong> — draw a line through P and Q, find the third intersection with the curve, reflect over the x-axis. That's P + Q.</li>
            <li><strong>Point doubling</strong> — when P = Q, use the tangent line at P instead.</li>
            <li><strong>Scalar multiplication</strong> — kP = P + P + ... + P (k times), computed efficiently via double-and-add in O(log k) steps.</li>
            <li><strong>Group order</strong> — the number of points on the curve. By Hasse's theorem: |#E - (p+1)| ≤ 2√p.</li>
            <li><strong>Generator</strong> — a point whose multiples produce every point in the group (or a large subgroup).</li>
          </ul>
        </details>
      </div>

      {/* Curve Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Curve Parameters</CardTitle>
          <CardDescription>
            E(F<sub>p</sub>): y² = x³ + Ax + B (mod p). The discriminant 4A³ + 27B² must be non-zero mod p (no singular points).
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
          <TabsTrigger value="add">Addition</TabsTrigger>
          <TabsTrigger value="mul">Multiply</TabsTrigger>
          <TabsTrigger value="montgomery">Montgomery</TabsTrigger>
          <TabsTrigger value="bsgs">BSGS</TabsTrigger>
          <TabsTrigger value="points">Points</TabsTrigger>
        </TabsList>

        {/* Point Addition */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">P + Q = R</CardTitle>
              <CardDescription>Add two points on the curve using the chord-and-tangent rule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Draw a line through P and Q. It intersects the curve at a third point R'. Reflect R' over the x-axis to get R = P + Q. When P = Q, use the tangent line (point doubling). The slope λ is computed mod p using modular inverse.</p>
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
              <p className="text-xs text-muted-foreground">Double-and-add scans k's binary representation from MSB to LSB. For each bit: double the accumulator, then add P if the bit is 1. This computes kP in O(log k) group operations instead of O(k). The step table below shows each operation — this is the "forward" direction that's easy. Reversing it (given P and kP, find k) is the ECDLP.</p>
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

        {/* Montgomery Ladder */}
        <TabsContent value="montgomery">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Montgomery Ladder: k × P</CardTitle>
              <CardDescription>Constant-time scalar multiplication — same operations for bit=0 and bit=1, resisting simple power analysis (SPA)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Standard double-and-add leaks the secret scalar k through timing or power analysis: an attacker can distinguish "double" from "double-then-add" for each bit. The Montgomery ladder always performs exactly one addition and one doubling per bit, regardless of the bit value. R0 and R1 always differ by exactly P — only which register gets the add vs double changes. Compare the step table with double-and-add above to see the constant operation pattern.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="mk">k (scalar)</Label>
                  <Input id="mk" value={mk} onChange={e => setMk(e.target.value)} placeholder="5" className="font-mono" />
                </div>
                <div>
                  <Label htmlFor="mpx">P.x</Label>
                  <Input id="mpx" value={mpx} onChange={e => setMpx(e.target.value)} placeholder="0" className="font-mono" />
                </div>
                <div>
                  <Label htmlFor="mpy">P.y</Label>
                  <Input id="mpy" value={mpy} onChange={e => setMpy(e.target.value)} placeholder="0" className="font-mono" />
                </div>
              </div>
              <Button onClick={doMontgomery} className="w-full">Compute kP (Montgomery)</Button>
              {montError && <p className="text-sm text-destructive">{montError}</p>}
              {montResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>Result</Badge>
                    <span className="font-mono font-semibold text-lg">{pointStr(montResult.result)}</span>
                  </div>
                  {montResult.steps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Montgomery ladder steps (MSB → LSB):</p>
                      <div className="overflow-auto max-h-72">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted">
                            <tr className="border-b">
                              <th className="text-left py-1.5 px-2">Bit</th>
                              <th className="text-left py-1.5 px-2">Value</th>
                              <th className="text-left py-1.5 px-2">Operation</th>
                              <th className="text-left py-1.5 px-2">R0</th>
                              <th className="text-left py-1.5 px-2">R1</th>
                            </tr>
                          </thead>
                          <tbody>
                            {montResult.steps.map((step, i) => (
                              <tr key={i} className="border-b">
                                <td className="py-1 px-2 font-mono">{step.bit}</td>
                                <td className="py-1 px-2 font-mono font-bold">{step.bitValue}</td>
                                <td className="py-1 px-2 font-mono text-xs">{step.operation}</td>
                                <td className="py-1 px-2 font-mono text-xs">{pointStr(step.R0)}</td>
                                <td className="py-1 px-2 font-mono text-xs">{pointStr(step.R1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Every bit processes exactly one ADD + one DOUBLE. An attacker measuring power consumption
                        sees the same pattern regardless of the secret scalar — this is the key advantage over double-and-add.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BSGS Discrete Log */}
        <TabsContent value="bsgs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Baby-step Giant-step: find k where kG = Q</CardTitle>
              <CardDescription>O(√n) algorithm for the Elliptic Curve Discrete Logarithm Problem (ECDLP). Requires p ≤ 10000.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">BSGS is a time-space tradeoff: write k = im + j where m = ⌈√n⌉. Precompute a table of "baby steps" jG for j = 0..m-1. Then compute "giant steps" Q - imG for i = 0,1,2... and look for a match in the table. When found, k = im + j. This reduces O(n) brute force to O(√n) operations with O(√n) storage. For real curves (n ≈ 2²⁵⁶), even √n ≈ 2¹²⁸ is infeasible — that's why EC cryptography is secure.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Base Point G</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="bgGx" className="text-xs text-muted-foreground">G.x</Label>
                      <Input id="bgGx" value={bgGx} onChange={e => setBgGx(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                    <div>
                      <Label htmlFor="bgGy" className="text-xs text-muted-foreground">G.y</Label>
                      <Input id="bgGy" value={bgGy} onChange={e => setBgGy(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Target Point Q</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="bgQx" className="text-xs text-muted-foreground">Q.x</Label>
                      <Input id="bgQx" value={bgQx} onChange={e => setBgQx(e.target.value)} placeholder="0" className="font-mono" />
                    </div>
                    <div>
                      <Label htmlFor="bgQy" className="text-xs text-muted-foreground">Q.y</Label>
                      <Input id="bgQy" value={bgQy} onChange={e => setBgQy(e.target.value)} placeholder="0" className="font-mono" />
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
                        if (!bgGx && !bgGy) { setBgGx(pt.x.toString()); setBgGy(pt.y.toString()); }
                        else { setBgQx(pt.x.toString()); setBgQy(pt.y.toString()); }
                      }}
                    >
                      ({pt.x.toString()},{pt.y.toString()})
                    </Badge>
                  ))}
                </div>
              )}
              <Button onClick={doBSGS} className="w-full">Solve ECDLP</Button>
              {bsgsError && <p className="text-sm text-destructive">{bsgsError}</p>}
              {bsgsResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={bsgsResult.k !== null ? 'default' : 'destructive'}>
                      {bsgsResult.k !== null ? 'Solution Found' : 'No Solution'}
                    </Badge>
                    {bsgsResult.k !== null && (
                      <span className="font-mono font-semibold text-lg">k = {bsgsResult.k.toString()}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order of G</span>
                      <p className="font-mono font-semibold">{bsgsResult.order.toString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">m = ⌈√order⌉</span>
                      <p className="font-mono font-semibold">{bsgsResult.babySteps}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Baby steps</span>
                      <p className="font-mono font-semibold">{bsgsResult.babySteps}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Giant steps</span>
                      <p className="font-mono font-semibold">{bsgsResult.giantSteps}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Total operations:</strong> {bsgsResult.totalOps} (BSGS) vs {bsgsResult.order.toString()} (brute force)</p>
                    <p>BSGS achieves O(√n) time and space by precomputing a table of baby steps jG, then
                       checking if Q − imG matches any table entry. This is the best generic ECDLP solver —
                       real-world curves use orders ≈ 2²⁵⁶ to make even √n infeasible.</p>
                  </div>
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
              <CardDescription className="space-y-1"><p className="text-xs text-muted-foreground mb-1">For small primes, we can enumerate every point by testing which x values have a square root y² ≡ x³ + Ax + B (mod p). Points with order equal to the group size are generators — their multiples produce every point. Click any point to use it in the Addition tab.</p></CardDescription>
              <CardDescription>
                {allPoints
                  ? `${allPoints.length} points + point at infinity (O)${allPoints.length > POINTS_TABLE_CAP ? ` — showing first ${POINTS_TABLE_CAP}` : ''}`
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
                      {allPoints.slice(0, POINTS_TABLE_CAP).map((pt, i) => {
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
                  {allPoints.length > POINTS_TABLE_CAP && (
                    <p className="text-xs text-muted-foreground py-3 px-3 border-t">
                      {allPoints.length - POINTS_TABLE_CAP} more points hidden — rendering all {allPoints.length}+
                      rows at once stalls the browser. Use a smaller prime p to view the full group.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
