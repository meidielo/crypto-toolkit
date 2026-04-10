import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { mod, modPow, modInverse } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { randModBig } from '@/lib/num-util';


type Phase = 'setup' | 'split' | 'reconstruct';

export function ShamirSSS() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [pStr, setPStr] = useState('257');
  const [secretStr, setSecretStr] = useState('42');
  const [thresholdStr, setThresholdStr] = useState('3');
  const [totalStr, setTotalStr] = useState('5');
  const [error, setError] = useState('');

  const [coefficients, setCoefficients] = useState<bigint[]>([]);
  const [shares, setShares] = useState<{ x: bigint; y: bigint }[]>([]);
  const [selectedShares, setSelectedShares] = useState<Set<number>>(new Set());
  const [reconstructed, setReconstructed] = useState<bigint | null>(null);

  function doSplit() {
    setError('');
    const p = parseBigInt(pStr), secret = parseBigInt(secretStr);
    const t = parseInt(thresholdStr), n = parseInt(totalStr);
    if (!p || secret === null) { setError('Enter p and secret'); return; }
    if (!isPrime(p)) { setError('p must be prime'); return; }
    if (secret >= p) { setError('Secret must be < p'); return; }
    if (t < 2 || t > n || n < 2 || n > 20) { setError('Need 2 ≤ threshold ≤ total ≤ 20'); return; }

    // Generate random polynomial f(x) = secret + a1*x + a2*x^2 + ... + a(t-1)*x^(t-1) mod p
    // Rejection sampling (randModBig) — unbiased, so each coefficient is
    // uniform in [0, p). Biased sampling would skew share distribution and
    // weaken the information-theoretic security claim in the UI.
    const coeffs: bigint[] = [secret];
    for (let i = 1; i < t; i++) {
      coeffs.push(randModBig(p));
    }
    setCoefficients(coeffs);

    // Evaluate at x = 1, 2, ..., n
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
    setSelectedShares(new Set());
    setReconstructed(null);
    setPhase('split');
  }

  function toggleShare(idx: number) {
    const next = new Set(selectedShares);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedShares(next);
    setReconstructed(null);
  }

  function doReconstruct() {
    const p = parseBigInt(pStr)!;
    const selected = Array.from(selectedShares).map(i => shares[i]);

    // Lagrange interpolation at x=0 to recover the secret
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
    setReconstructed(secret);
    setPhase('reconstruct');
  }

  const t = parseInt(thresholdStr) || 3;

  const phaseOrder: Phase[] = ['setup', 'split', 'reconstruct'];
  const phaseIdx = phaseOrder.indexOf(phase);
  function getStatus(ph: Phase): 'pending' | 'active' | 'complete' {
    const idx = phaseOrder.indexOf(ph);
    if (idx < phaseIdx) return 'complete';
    if (idx === phaseIdx) return 'active';
    return 'pending';
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Shamir's Secret Sharing</CardTitle>
          <CardDescription>
            Split a secret into n shares where any t shares can reconstruct it, but t-1 shares
            reveal nothing. Uses polynomial interpolation over a finite field F_p.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup & Split" status={getStatus('setup')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">p (prime field)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Secret (0..p-1)</Label><Input value={secretStr} onChange={e => setSecretStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Threshold (t)</Label><Input value={thresholdStr} onChange={e => setThresholdStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Total shares (n)</Label><Input value={totalStr} onChange={e => setTotalStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSplit} className="w-full">Generate Shares</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Shares & Polynomial" status={getStatus('split')}>
        {shares.length > 0 && (
          <div className="space-y-3">
            <FormulaBox>
              <p className="text-xs text-muted-foreground mb-1">Random polynomial (degree {t - 1}):</p>
              <ComputationRow
                label="f(x)"
                value={coefficients.map((c, i) => i === 0 ? c.toString() : `${c}x${i > 1 ? '^' + i : ''}`).join(' + ') + ` mod ${pStr}`}
                highlight
              />
            </FormulaBox>

            <p className="text-xs text-muted-foreground">Click {t} or more shares to select for reconstruction:</p>
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

            <Button
              onClick={doReconstruct}
              disabled={selectedShares.size < 2}
              className="w-full"
            >
              Reconstruct Secret ({selectedShares.size} shares)
            </Button>
          </div>
        )}
      </StepCard>

      <StepCard step={3} title="Reconstruction (Lagrange Interpolation)" status={getStatus('reconstruct')}>
        {reconstructed !== null && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Shares used" value={selectedShares.size.toString()} />
              <ComputationRow label="Threshold" value={t.toString()} />
              <ComputationRow label="Reconstructed secret" value={reconstructed.toString()} highlight />
              <ComputationRow label="Original secret" value={secretStr} />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={reconstructed.toString() === secretStr ? 'default' : 'destructive'}>
                  {reconstructed.toString() === secretStr ? 'CORRECT' : selectedShares.size < t ? `WRONG (need ${t} shares, only have ${selectedShares.size})` : 'WRONG'}
                </Badge>
              </div>
            </FormulaBox>

            {selectedShares.size < t && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-600 dark:text-green-400">
                <strong>Information-theoretic security:</strong> With fewer than {t} shares, the reconstructed
                value is uniformly random over F_p. Every possible secret is equally likely — no information
                is leaked. Try selecting {t} shares to see the correct reconstruction.
              </div>
            )}
          </div>
        )}
      </StepCard>
    </div>
  );
}
