import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { mod, modPow } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { randModBig } from '@/lib/num-util';


type Phase = 'setup' | 'commit' | 'challenge' | 'respond' | 'verify';

export function SchnorrZKP() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [pStr, setPStr] = useState('23');
  const [gStr, setGStr] = useState('5');
  const [xStr, setXStr] = useState('7');
  const [yVal, setYVal] = useState<bigint | null>(null);
  // Order of the subgroup ⟨g⟩. Schnorr operates over this subgroup, not Z_p*,
  // so the challenge and response must be reduced mod q (not mod p-1).
  const [qVal, setQVal] = useState<bigint | null>(null);
  const [setupError, setSetupError] = useState('');

  const [rStr, setRStr] = useState('11');
  const [tVal, setTVal] = useState<bigint | null>(null);

  const [cVal, setCVal] = useState<bigint | null>(null);

  const [sVal, setSVal] = useState<bigint | null>(null);

  const [verifyResult, setVerifyResult] = useState<{ lhs: bigint; rhs: bigint; valid: boolean } | null>(null);

  function doSetup() {
    setSetupError('');
    const p = parseBigInt(pStr), g = parseBigInt(gStr), x = parseBigInt(xStr);
    if (p === null || g === null || x === null) { setSetupError('Enter all parameters'); return; }
    if (p < 3n) { setSetupError('p must be at least 3'); return; }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    if (g <= 1n || g >= p) { setSetupError('g must satisfy 1 < g < p'); return; }
    if (x <= 0n) { setSetupError('x must be positive'); return; }
    // Fermat only says g^(p-1) ≡ 1 — true for every g coprime to p, so it does
    // not prove g generates the full group. Compute the actual multiplicative
    // order of g: the smallest q > 0 with g^q ≡ 1 mod p. Schnorr then operates
    // in ⟨g⟩ (size q), and the challenge/response must be reduced mod q — not
    // mod p-1 — otherwise the soundness/completeness arguments don't hold.
    let q = 0n;
    let acc = 1n;
    const maxOrder = p; // order divides p-1 but we guard below anyway
    for (let i = 1n; i <= maxOrder; i++) {
      acc = (acc * g) % p;
      if (acc === 1n) { q = i; break; }
    }
    if (q === 0n || q < 2n) {
      setSetupError('g has trivial order — pick a different generator');
      return;
    }
    setQVal(q);
    setYVal(modPow(g, mod(x, q), p));
    setPhase('commit');
  }

  function doCommit() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!, r = parseBigInt(rStr);
    if (!r) return;
    setTVal(modPow(g, r, p));
    setPhase('challenge');
  }

  function doChallenge() {
    if (qVal === null) return;
    // Verifier picks random challenge in [1, q) where q = ord(g). Unbiased via rejection sampling.
    const c = qVal > 2n ? randModBig(qVal - 1n) + 1n : 1n;
    setCVal(c);
    setPhase('respond');
  }

  function doRespond() {
    const x = parseBigInt(xStr);
    const r = parseBigInt(rStr);
    if (x === null || r === null || cVal === null || qVal === null) return;
    // Response reduced mod q (the group order), not mod p-1.
    const s = mod(r + cVal * x, qVal);
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

  // Cheating prover mode — demonstrates soundness
  const [cheatingMode, setCheatingMode] = useState(false);

  function doCheatingProof() {
    // Cheater doesn't know x. They pick s randomly in [0, q), then need t = g^s * y^(-c) mod p.
    // This only works if they can predict c BEFORE committing t.
    if (!yVal || !cVal || qVal === null) return;
    const fakeS = randModBig(qVal);
    setSVal(fakeS);
    // The cheater committed t BEFORE seeing c. To pass verification,
    // t would need to equal g^s * y^(-c) mod p — but t was committed
    // before c was known, so this almost certainly fails.
    setPhase('verify');
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
            {qVal !== null && (
              <ComputationRow label="q = ord(g)" formula="smallest q : g^q ≡ 1 mod p" value={qVal.toString()} />
            )}
            <p className="text-xs text-muted-foreground mt-1">Verifier knows (p, g, y). Prover knows x. Challenge and response are reduced mod q (the order of ⟨g⟩), not mod p-1.</p>
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
            <div className="flex gap-2 mb-2">
              <Badge
                variant={!cheatingMode ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCheatingMode(false)}
              >Honest Prover</Badge>
              <Badge
                variant={cheatingMode ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCheatingMode(true)}
              >Cheating Prover</Badge>
            </div>
            {cheatingMode ? (
              <Button onClick={doCheatingProof} className="w-full bg-red-600 hover:bg-red-700" size="sm">
                Fake Response (without knowing x)
              </Button>
            ) : (
              <Button onClick={doRespond} className="w-full" size="sm">Compute s = r + c·x mod q</Button>
            )}
            {sVal !== null && (
              <FormulaBox>
                <ComputationRow label="s" formula={`${rStr} + ${cVal}·${xStr} mod ${qVal?.toString() ?? '?'}`} value={sVal.toString()} highlight />
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
                {verifyResult.valid && !cheatingMode && (
                  <p className="text-xs text-muted-foreground mt-2">
                    The Verifier is convinced the Prover knows x, but learned nothing about the value of x itself.
                    This is a zero-knowledge proof — the transcript (t, c, s) can be simulated without knowing x.
                  </p>
                )}
                {!verifyResult.valid && cheatingMode && (
                  <div className="mt-2 pt-2 border-t space-y-2">
                    <p className="text-xs text-red-500">
                      <strong>Soundness demonstrated:</strong> The cheating prover committed to t BEFORE seeing the challenge c.
                      To fake the proof, they would need to predict c — which is random.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Probability analysis:</strong></p>
                      <p>Cheater succeeds with probability 1/q per round = 1/{qVal?.toString() ?? '?'} ≈ {qVal ? (100 / Number(qVal)).toFixed(2) : '?'}% (q = ord(g))</p>
                      <p>After k rounds: (1/{qVal?.toString() ?? '?'})^k</p>
                      <p>For cryptographic security: use q ≈ 2^256, giving 1/2^256 per round — computationally impossible to cheat.</p>
                      <p>This is why the subgroup order q matters in ZKP — small q makes cheating feasible, large q makes it impossible.</p>
                    </div>
                  </div>
                )}
              </FormulaBox>
            )}
          </StepCard>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-blue-600 dark:text-blue-400 space-y-1">
        <p className="font-semibold">In Practice: EC-Schnorr and EdDSA</p>
        <p>Modern Schnorr signatures use elliptic curves instead of discrete log over Z_p*. EdDSA (Ed25519, Ed448) is Schnorr instantiated over twisted Edwards curves — the same commit-challenge-response structure, but with EC scalar multiplication instead of modular exponentiation. The cofactor is handled by the curve design, eliminating subgroup attacks.</p>
      </div>
    </div>
  );
}
