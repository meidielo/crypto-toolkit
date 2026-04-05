import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { mod, modPow } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try { const t = s.trim(); if (!t) return null; return BigInt(t); } catch { return null; }
}

type Phase = 'setup' | 'commit' | 'challenge' | 'respond' | 'verify';

export function SchnorrZKP() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [pStr, setPStr] = useState('23');
  const [gStr, setGStr] = useState('5');
  const [xStr, setXStr] = useState('7');
  const [yVal, setYVal] = useState<bigint | null>(null);
  const [setupError, setSetupError] = useState('');

  const [rStr, setRStr] = useState('11');
  const [tVal, setTVal] = useState<bigint | null>(null);

  const [cVal, setCVal] = useState<bigint | null>(null);

  const [sVal, setSVal] = useState<bigint | null>(null);

  const [verifyResult, setVerifyResult] = useState<{ lhs: bigint; rhs: bigint; valid: boolean } | null>(null);

  function doSetup() {
    setSetupError('');
    const p = parseBigInt(pStr), g = parseBigInt(gStr), x = parseBigInt(xStr);
    if (!p || !g || !x) { setSetupError('Enter all parameters'); return; }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    setYVal(modPow(g, x, p));
    setPhase('commit');
  }

  function doCommit() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!, r = parseBigInt(rStr);
    if (!r) return;
    setTVal(modPow(g, r, p));
    setPhase('challenge');
  }

  function doChallenge() {
    const p = parseBigInt(pStr)!;
    // Verifier picks random challenge
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const c = mod(BigInt(arr[0]), p - 2n) + 1n;
    setCVal(c);
    setPhase('respond');
  }

  function doRespond() {
    const p = parseBigInt(pStr)!, x = parseBigInt(xStr)!, r = parseBigInt(rStr)!;
    if (!cVal) return;
    const s = mod(r + cVal * x, p - 1n);
    setSVal(s);
    setPhase('verify');
  }

  const [verifyError, setVerifyError] = useState('');

  function doVerify() {
    setVerifyError('');
    const p = parseBigInt(pStr), g = parseBigInt(gStr);
    if (!p || !g) { setVerifyError('Missing parameters'); return; }
    if (sVal === null || tVal === null || cVal === null || yVal === null) {
      setVerifyError('Complete all previous steps first');
      return;
    }
    try {
      const lhs = modPow(g, sVal, p);
      const rhs = mod(tVal * modPow(yVal, cVal, p), p);
      setVerifyResult({ lhs, rhs, valid: lhs === rhs });
    } catch (e) {
      setVerifyError(String(e));
    }
  }

  const phaseOrder: Phase[] = ['setup', 'commit', 'challenge', 'respond', 'verify'];
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
          <CardTitle className="text-lg">Schnorr Identification Protocol (Zero-Knowledge Proof)</CardTitle>
          <CardDescription>
            The Prover proves knowledge of secret x without revealing it. The Verifier learns nothing except that the Prover knows x.
            This is the foundation of privacy-preserving authentication and digital signatures.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup */}
      <StepCard step={1} title="Setup: Public Parameters & Keys" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">p (prime)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">g (generator)</Label><Input value={gStr} onChange={e => setGStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">x (Prover's secret)</Label><Input value={xStr} onChange={e => setXStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Compute Public Key y = g^x mod p</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
        {yVal !== null && (
          <FormulaBox>
            <ComputationRow label="y (public)" formula="g^x mod p" value={yVal.toString()} highlight />
            <p className="text-xs text-muted-foreground mt-1">Verifier knows (p, g, y). Prover knows x. Goal: prove knowledge of x without revealing it.</p>
          </FormulaBox>
        )}
      </StepCard>

      {/* Two-panel layout for the protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prover side */}
        <div className="space-y-4">
          <div className="text-center">
            <Badge variant="outline" className="text-sm">Prover (knows x)</Badge>
          </div>

          <StepCard step={2} title="Commitment: Pick random r" status={getStatus('commit')}>
            <div><Label className="text-xs">r (random secret)</Label><Input value={rStr} onChange={e => setRStr(e.target.value)} className="font-mono" /></div>
            <Button onClick={doCommit} className="w-full" size="sm">Compute t = g^r mod p</Button>
            {tVal !== null && (
              <FormulaBox>
                <ComputationRow label="t" formula="g^r mod p" value={tVal.toString()} highlight />
                <p className="text-xs text-muted-foreground">Prover sends t → Verifier</p>
              </FormulaBox>
            )}
          </StepCard>

          <StepCard step={4} title="Response: Compute s" status={getStatus('respond')}>
            <Button onClick={doRespond} className="w-full" size="sm">Compute s = r + c·x mod (p-1)</Button>
            {sVal !== null && (
              <FormulaBox>
                <ComputationRow label="s" formula={`${rStr} + ${cVal}·${xStr} mod ${BigInt(parseBigInt(pStr)! - 1n)}`} value={sVal.toString()} highlight />
                <p className="text-xs text-muted-foreground">Prover sends s → Verifier</p>
              </FormulaBox>
            )}
          </StepCard>
        </div>

        {/* Verifier side */}
        <div className="space-y-4">
          <div className="text-center">
            <Badge variant="outline" className="text-sm">Verifier (knows y, not x)</Badge>
          </div>

          <StepCard step={3} title="Challenge: Pick random c" status={getStatus('challenge')}>
            <Button onClick={doChallenge} className="w-full" size="sm">Generate Random Challenge c</Button>
            {cVal !== null && (
              <FormulaBox>
                <ComputationRow label="c (challenge)" value={cVal.toString()} highlight />
                <p className="text-xs text-muted-foreground">Verifier sends c → Prover</p>
              </FormulaBox>
            )}
          </StepCard>

          <StepCard step={5} title="Verify: Check g^s = t · y^c" status={getStatus('verify')}>
            <Button onClick={doVerify} className="w-full" size="sm">Verify</Button>
            {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
            {verifyResult && (
              <FormulaBox>
                <ComputationRow label="g^s mod p" value={verifyResult.lhs.toString()} />
                <ComputationRow label="t · y^c mod p" value={verifyResult.rhs.toString()} />
                <div className="mt-2 pt-2 border-t flex items-center gap-2">
                  <Badge variant={verifyResult.valid ? 'default' : 'destructive'}>
                    {verifyResult.valid ? 'PROOF ACCEPTED' : 'PROOF REJECTED'}
                  </Badge>
                </div>
                {verifyResult.valid && (
                  <p className="text-xs text-muted-foreground mt-2">
                    The Verifier is convinced the Prover knows x, but learned nothing about the value of x itself.
                    This is a zero-knowledge proof — the transcript (t, c, s) can be simulated without knowing x.
                  </p>
                )}
              </FormulaBox>
            )}
          </StepCard>
        </div>
      </div>
    </div>
  );
}
