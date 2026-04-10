import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormulaBox, ComputationRow } from '@/components/StepCard';
import { mod, modPow, modInverse } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { randModBig } from '@/lib/num-util';

export function ShamirSSS() {
  const [tab, setTab] = useState('setup');

  const [pStr, setPStr] = useState('257');
  const [secretStr, setSecretStr] = useState('42');
  const [thresholdStr, setThresholdStr] = useState('3');
  const [totalStr, setTotalStr] = useState('5');
  const [error, setError] = useState('');

  const [coefficients, setCoefficients] = useState<bigint[]>([]);
  const [shares, setShares] = useState<{ x: bigint; y: bigint }[]>([]);
  const [distributed, setDistributed] = useState<Set<number>>(new Set());

  // Reconstruction state
  const [selectedShares, setSelectedShares] = useState<Set<number>>(new Set());
  const [reconstructed, setReconstructed] = useState<bigint | null>(null);

  // Security analysis state
  const [insufficientResults, setInsufficientResults] = useState<{ count: number; secret: bigint }[]>([]);

  const t = parseInt(thresholdStr) || 3;

  function doSplit() {
    setError('');
    const p = parseBigInt(pStr), secret = parseBigInt(secretStr);
    const tVal = parseInt(thresholdStr), n = parseInt(totalStr);
    if (!p || secret === null) { setError('Enter p and secret'); return; }
    if (!isPrime(p)) { setError('p must be prime'); return; }
    if (secret < 0n || secret >= p) { setError('Secret must be in [0, p)'); return; }
    if (tVal < 2 || tVal > n || n < 2 || n > 20) { setError('Need 2 ≤ threshold ≤ total ≤ 20'); return; }

    const coeffs: bigint[] = [secret];
    for (let i = 1; i < tVal; i++) {
      coeffs.push(randModBig(p));
    }
    setCoefficients(coeffs);

    const newShares: { x: bigint; y: bigint }[] = [];
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i);
      let y = 0n;
      for (let j = 0; j < coeffs.length; j++) {
        y = mod(y + coeffs[j] * modPow(x, BigInt(j), p), p);
      }
      newShares.push({ x, y });
    }
    setShares(newShares);
    setDistributed(new Set());
    setSelectedShares(new Set());
    setReconstructed(null);
    setInsufficientResults([]);
    setTab('distribute');
  }

  function toggleDistribute(idx: number) {
    const next = new Set(distributed);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setDistributed(next);
  }

  function toggleShare(idx: number) {
    const next = new Set(selectedShares);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedShares(next);
    setReconstructed(null);
  }

  function lagrangeReconstruct(indices: number[]): bigint {
    const p = parseBigInt(pStr)!;
    const selected = indices.map(i => shares[i]);
    let secret = 0n;
    for (let i = 0; i < selected.length; i++) {
      let num = 1n, den = 1n;
      for (let j = 0; j < selected.length; j++) {
        if (i === j) continue;
        num = mod(num * (0n - selected[j].x), p);
        den = mod(den * (selected[i].x - selected[j].x), p);
      }
      const lagrange = mod(num * modInverse(den, p), p);
      secret = mod(secret + selected[i].y * lagrange, p);
    }
    return secret;
  }

  function doReconstruct() {
    setReconstructed(lagrangeReconstruct(Array.from(selectedShares)));
  }

  function doSecurityAnalysis() {
    if (shares.length === 0 || t < 2) return;
    // Try all C(n, t-1) subsets of size t-1
    const n = shares.length;
    const subsetSize = t - 1;
    const results: { count: number; secret: bigint }[] = [];

    function* combinations(arr: number[], k: number, start = 0, current: number[] = []): Generator<number[]> {
      if (current.length === k) { yield [...current]; return; }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        yield* combinations(arr, k, i + 1, current);
        current.pop();
      }
    }

    const indices = Array.from({ length: n }, (_, i) => i);
    let count = 0;
    for (const subset of combinations(indices, subsetSize)) {
      if (count >= 20) break; // cap for UI
      const secret = lagrangeReconstruct(subset);
      results.push({ count: count + 1, secret });
      count++;
    }
    setInsufficientResults(results);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Shamir's Secret Sharing — Key Ceremony</CardTitle>
          <CardDescription>
            Split a secret into n shares where any t shares can reconstruct it, but t-1 shares
            reveal nothing. Uses polynomial interpolation over F_p.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="setup">Dealer Setup</TabsTrigger>
          <TabsTrigger value="distribute">Distribution</TabsTrigger>
          <TabsTrigger value="reconstruct">Reconstruct</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Configure & Generate</CardTitle>
              <CardDescription>The dealer chooses parameters and generates a random polynomial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><Label className="text-xs">p (prime field)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">Secret (0..p-1)</Label><Input value={secretStr} onChange={e => setSecretStr(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">Threshold (t)</Label><Input value={thresholdStr} onChange={e => setThresholdStr(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">Total shares (n)</Label><Input value={totalStr} onChange={e => setTotalStr(e.target.value)} className="font-mono" /></div>
              </div>
              <Button onClick={doSplit} className="w-full">Generate Shares</Button>
              {error && <p className="text-sm text-destructive">{error}</p>}

              {coefficients.length > 0 && (
                <FormulaBox>
                  <p className="text-xs text-muted-foreground mb-1">Random polynomial (degree {t - 1}):</p>
                  <ComputationRow
                    label="f(x)"
                    value={coefficients.map((c, i) => i === 0 ? c.toString() : `${c}x${i > 1 ? '^' + i : ''}`).join(' + ') + ` mod ${pStr}`}
                    highlight
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    The constant term is the secret. The dealer destroys this polynomial after distributing shares.
                  </p>
                </FormulaBox>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribute">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Share Distribution</CardTitle>
              <CardDescription>Each participant receives exactly one share over a secure channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shares.length === 0 ? (
                <p className="text-sm text-muted-foreground">Generate shares in the Dealer Setup tab first.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {shares.map((share, i) => (
                      <div key={i} className={`rounded-lg border p-3 flex items-center justify-between ${distributed.has(i) ? 'bg-green-500/10 border-green-500/30' : 'bg-card'}`}>
                        <div>
                          <p className="text-xs text-muted-foreground">Participant {i + 1}</p>
                          <p className="font-mono font-semibold text-sm">({share.x.toString()}, {share.y.toString()})</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => copyToClipboard(`(${share.x}, ${share.y})`)}
                          >
                            Copy
                          </Button>
                          <Button
                            variant={distributed.has(i) ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => toggleDistribute(i)}
                          >
                            {distributed.has(i) ? '✓ Sent' : 'Distribute'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distributed: {distributed.size} / {shares.length}. In a real ceremony, shares are sent over secure channels
                    and the dealer destroys the polynomial.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconstruct">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Lagrange Reconstruction</CardTitle>
              <CardDescription>Select {t} or more shares to recover the secret via interpolation at x=0</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shares.length === 0 ? (
                <p className="text-sm text-muted-foreground">Generate shares first.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Click shares to select for reconstruction:</p>
                  <div className="flex flex-wrap gap-2">
                    {shares.map((share, i) => (
                      <Badge
                        key={i}
                        variant={selectedShares.has(i) ? 'default' : 'outline'}
                        className="cursor-pointer font-mono"
                        onClick={() => toggleShare(i)}
                      >
                        ({share.x.toString()}, {share.y.toString()})
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedShares.size} / {t} minimum
                  </p>

                  <Button onClick={doReconstruct} disabled={selectedShares.size < 2} className="w-full">
                    Reconstruct Secret ({selectedShares.size} shares)
                  </Button>

                  {reconstructed !== null && (
                    <FormulaBox>
                      <ComputationRow label="Shares used" value={selectedShares.size.toString()} />
                      <ComputationRow label="Threshold" value={t.toString()} />
                      <ComputationRow label="Reconstructed" value={reconstructed.toString()} highlight />
                      <ComputationRow label="Original secret" value={secretStr} />
                      <div className="mt-2 pt-2 border-t flex items-center gap-2">
                        <Badge variant={reconstructed.toString() === secretStr ? 'default' : 'destructive'}>
                          {reconstructed.toString() === secretStr ? 'CORRECT' : selectedShares.size < t ? `WRONG (need ${t}, have ${selectedShares.size})` : 'WRONG'}
                        </Badge>
                      </div>
                    </FormulaBox>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Security Analysis</CardTitle>
              <CardDescription>Demonstrate that t-1 shares reveal zero information about the secret</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shares.length === 0 ? (
                <p className="text-sm text-muted-foreground">Generate shares first.</p>
              ) : (
                <>
                  <Button onClick={doSecurityAnalysis} className="w-full">
                    Try all subsets of {t - 1} shares (insufficient)
                  </Button>

                  {insufficientResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="overflow-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-card">
                            <tr className="border-b">
                              <th className="text-left py-1.5 px-2">#</th>
                              <th className="text-left py-1.5 px-2">Shares used</th>
                              <th className="text-left py-1.5 px-2">Reconstructed</th>
                              <th className="text-left py-1.5 px-2">Correct?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {insufficientResults.map((r, i) => (
                              <tr key={i} className="border-b">
                                <td className="py-1 px-2 text-muted-foreground">{r.count}</td>
                                <td className="py-1 px-2 font-mono text-xs">{t - 1} of {shares.length}</td>
                                <td className="py-1 px-2 font-mono">{r.secret.toString()}</td>
                                <td className="py-1 px-2">
                                  <Badge variant={r.secret.toString() === secretStr ? 'default' : 'destructive'} className="text-xs">
                                    {r.secret.toString() === secretStr ? 'Match (coincidence)' : 'Wrong'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-600 dark:text-green-400 space-y-2">
                        <p><strong>Information-theoretic security:</strong> Each subset of {t - 1} shares produces a different
                          "reconstructed" value. Every secret in F_{pStr} is equally likely — the attacker gains zero bits
                          of information.</p>
                        <p>This is provable, not just computational: for any secret s and any {t - 1} shares, there exists
                          exactly one degree-{t - 1} polynomial passing through those shares with f(0) = s. An attacker
                          with unbounded compute power still cannot distinguish the real secret.</p>
                      </div>
                    </div>
                  )}

                  {shares.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
                      <p className="font-medium">Why ({t}, {shares.length}) secret sharing?</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Any {t} participants can reconstruct (quorum)</li>
                        <li>{t - 1} or fewer learn nothing (information-theoretic)</li>
                        <li>Used in: key escrow, multi-sig wallets, HSM backup, MPC protocols</li>
                        <li>Shamir (1979) — same year as RSA. Still state of the art for threshold schemes.</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
