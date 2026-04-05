import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import {
  mod,
  scalarMultiply,
  isOnCurve,
  isInfinity,
  modInverse,
  type ECPoint,
} from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try { const t = s.trim(); if (!t) return null; if (t.startsWith('-')) return -BigInt(t.slice(1)); return BigInt(t); } catch { return null; }
}
function pointStr(P: ECPoint): string {
  if (isInfinity(P)) return 'O (infinity)';
  return `(${P.x}, ${P.y})`;
}

type Phase = 'setup' | 'sign1' | 'sign2' | 'extract' | 'verify';

export function NonceReuseAttack() {
  const [phase, setPhase] = useState<Phase>('setup');

  // Setup
  // Using curve y²=x³+2x+3 mod 97, order q=89 (prime), G=(3,6)
  const [aStr, setAStr] = useState('2');
  const [bStr, setBStr] = useState('3');
  const [pStr, setPStr] = useState('97');
  const [gxStr, setGxStr] = useState('3');
  const [gyStr, setGyStr] = useState('6');
  const [qStr, setQStr] = useState('89');
  const [dStr, setDStr] = useState('7');
  const [pubKey, setPubKey] = useState<ECPoint | null>(null);
  const [setupError, setSetupError] = useState('');

  // Sign 1
  const [h1Str, setH1Str] = useState('10');
  const [kStr, setKStr] = useState('3');
  const [sig1, setSig1] = useState<{ r: bigint; s: bigint; R: ECPoint } | null>(null);

  // Sign 2
  const [h2Str, setH2Str] = useState('20');
  const [sig2, setSig2] = useState<{ r: bigint; s: bigint } | null>(null);

  // Extract
  const [extracted, setExtracted] = useState<{
    kRecovered: bigint; dRecovered: bigint; match: boolean;
  } | null>(null);

  function doSetup() {
    setSetupError('');
    const p = parseBigInt(pStr), A = parseBigInt(aStr), B = parseBigInt(bStr);
    const gx = parseBigInt(gxStr), gy = parseBigInt(gyStr);
    const q = parseBigInt(qStr), d = parseBigInt(dStr);
    if (!p || !A || !B || gx === null || gy === null || !q || !d) { setSetupError('Fill all fields'); return; }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    const G: ECPoint = { x: gx, y: gy };
    if (!isOnCurve(G, A, B, p)) { setSetupError('G is not on the curve'); return; }
    setPubKey(scalarMultiply(d, G, A, p));
    setPhase('sign1');
  }

  function doSign1() {
    const A = parseBigInt(aStr)!, p = parseBigInt(pStr)!, q = parseBigInt(qStr)!, d = parseBigInt(dStr)!;
    const gx = parseBigInt(gxStr)!, gy = parseBigInt(gyStr)!;
    const h1 = parseBigInt(h1Str), k = parseBigInt(kStr);
    if (h1 === null || !k) return;
    const G: ECPoint = { x: gx, y: gy };
    const R = scalarMultiply(k, G, A, p);
    const r = mod(R.x, q);
    const kInv = modInverse(k, q);
    const s = mod(kInv * (h1 + r * d), q);
    setSig1({ r, s, R });
    setPhase('sign2');
  }

  function doSign2() {
    const q = parseBigInt(qStr)!, d = parseBigInt(dStr)!, k = parseBigInt(kStr)!;
    const h2 = parseBigInt(h2Str);
    if (h2 === null || !sig1) return;
    // Same k! Same r!
    const kInv = modInverse(k, q);
    const s = mod(kInv * (h2 + sig1.r * d), q);
    setSig2({ r: sig1.r, s });
    setPhase('extract');
  }

  const [extractError, setExtractError] = useState('');

  function doExtract() {
    setExtractError('');
    if (!sig1 || !sig2) return;
    const q = parseBigInt(qStr)!, d = parseBigInt(dStr)!;
    const h1 = parseBigInt(h1Str)!, h2 = parseBigInt(h2Str)!;
    const { r, s: s1 } = sig1;
    const { s: s2 } = sig2;

    try {
      if (mod(s1 - s2, q) === 0n) {
        setExtractError('s1 = s2 — the signatures are identical. Use different hash values (H1 ≠ H2) to demonstrate the attack.');
        return;
      }
      // k = (H1 - H2) / (s1 - s2) mod q
      const kRecovered = mod((h1 - h2) * modInverse(mod(s1 - s2, q), q), q);

      // d = (s1*k - H1) / r mod q
      const dRecovered = mod((s1 * kRecovered - h1) * modInverse(r, q), q);

      setExtracted({ kRecovered, dRecovered, match: dRecovered === d });
      setPhase('verify');
    } catch (e) {
      setExtractError(`Computation failed: ${e}. Ensure q is prime (curve subgroup order).`);
    }
  }

  const phaseOrder: Phase[] = ['setup', 'sign1', 'sign2', 'extract', 'verify'];
  const phaseIdx = phaseOrder.indexOf(phase);
  function getStatus(p: Phase): 'pending' | 'active' | 'complete' {
    const idx = phaseOrder.indexOf(p);
    if (idx < phaseIdx) return 'complete';
    if (idx === phaseIdx) return 'active';
    return 'pending';
  }

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">ECDSA Nonce Reuse Attack</CardTitle>
          <CardDescription>
            Demonstrates how reusing the same nonce k for two different ECDSA signatures
            leaks the private key. This is the exact vulnerability that compromised the PS3 signing key in 2010.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup */}
      <StepCard step={1} title="Setup: Curve & Keys" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">A</Label><Input value={aStr} onChange={e => setAStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">B</Label><Input value={bStr} onChange={e => setBStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">p</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">G.x</Label><Input value={gxStr} onChange={e => setGxStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">G.y</Label><Input value={gyStr} onChange={e => setGyStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">q (order)</Label><Input value={qStr} onChange={e => setQStr(e.target.value)} className="font-mono" /></div>
        </div>
        <div><Label className="text-xs">d (private key - the secret we will recover)</Label><Input value={dStr} onChange={e => setDStr(e.target.value)} className="font-mono" /></div>
        <Button onClick={doSetup} className="w-full">Setup</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
        {pubKey && <FormulaBox><ComputationRow label="Q = dG" value={pointStr(pubKey)} highlight /></FormulaBox>}
      </StepCard>

      {/* Sign Message 1 */}
      <StepCard step={2} title="Sign Message 1 (with nonce k)" status={getStatus('sign1')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">H(m₁) — hash as integer</Label><Input value={h1Str} onChange={e => setH1Str(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">k (nonce)</Label><Input value={kStr} onChange={e => setKStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSign1} className="w-full">Sign Message 1</Button>
        {sig1 && (
          <FormulaBox>
            <ComputationRow label="R = kG" value={pointStr(sig1.R)} />
            <ComputationRow label="r" value={sig1.r.toString()} />
            <ComputationRow label="s₁" value={sig1.s.toString()} />
            <ComputationRow label="Signature 1" value={`(${sig1.r}, ${sig1.s})`} highlight />
          </FormulaBox>
        )}
      </StepCard>

      {/* Sign Message 2 — SAME k! */}
      <StepCard step={3} title="Sign Message 2 (SAME nonce k!)" status={getStatus('sign2')}>
        <InlineWarning>
          Using the SAME nonce k={kStr} for a different message. This is the fatal mistake.
        </InlineWarning>
        <div>
          <Label className="text-xs">H(m₂) — different hash</Label>
          <Input value={h2Str} onChange={e => setH2Str(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doSign2} className="w-full">Sign Message 2 (same k)</Button>
        {sig2 && sig1 && (
          <FormulaBox>
            <ComputationRow label="r (same!)" value={sig2.r.toString()} highlight />
            <ComputationRow label="s₂" value={sig2.s.toString()} />
            <ComputationRow label="Signature 2" value={`(${sig2.r}, ${sig2.s})`} highlight />
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-red-500 font-semibold">Both signatures share r = {sig1.r.toString()}. An attacker sees this and knows k was reused.</p>
            </div>
          </FormulaBox>
        )}
      </StepCard>

      {/* Extract Private Key */}
      <StepCard step={4} title="Extract Private Key d" status={getStatus('extract')}>
        <p className="text-xs text-muted-foreground">
          Given two signatures (r, s₁) and (r, s₂) with the same r, an attacker can recover k and then d:
        </p>
        <Button onClick={doExtract} className="w-full">Recover Private Key</Button>
        {extractError && <p className="text-sm text-destructive">{extractError}</p>}
        {extracted && sig1 && sig2 && (
          <FormulaBox>
            <p className="text-xs text-muted-foreground mb-2">Algebraic derivation:</p>
            <ComputationRow label="s₁ - s₂ mod q" value={mod(sig1.s - sig2.s, parseBigInt(qStr)!).toString()} />
            <ComputationRow label="H₁ - H₂ mod q" value={mod(parseBigInt(h1Str)! - parseBigInt(h2Str)!, parseBigInt(qStr)!).toString()} />
            <ComputationRow label="k" formula="(H₁-H₂)/(s₁-s₂) mod q" value={extracted.kRecovered.toString()} highlight />
            <ComputationRow label="d" formula="(s₁·k - H₁)/r mod q" value={extracted.dRecovered.toString()} highlight />
          </FormulaBox>
        )}
      </StepCard>

      {/* Verify */}
      <StepCard step={5} title="Verify: Does recovered d match?" status={getStatus('verify')}>
        {extracted && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Original d" value={dStr} />
              <ComputationRow label="Recovered d" value={extracted.dRecovered.toString()} highlight />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={extracted.match ? 'destructive' : 'default'}>
                  {extracted.match ? 'PRIVATE KEY COMPROMISED' : 'MISMATCH'}
                </Badge>
              </div>
            </FormulaBox>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Matters</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                Reusing nonce k in ECDSA completely breaks the scheme. The private key d can be
                algebraically recovered from just two signatures that share the same r value.
                This is not a brute-force attack — it is a direct algebraic extraction.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Real-world impact:</strong> Sony's PS3 ECDSA signing key was compromised in 2010
                because their implementation used a static nonce. RFC 6979 (deterministic k) was created
                specifically to prevent this class of vulnerability.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
