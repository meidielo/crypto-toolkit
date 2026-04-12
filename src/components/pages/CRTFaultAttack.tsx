import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { mod, modPow, modInverse } from '@/lib/ec-math';
import { gcd } from '@/lib/crypto-math';
import { parseBigInt } from '@/lib/parse';
import { randMod } from '@/lib/num-util';

type Phase = 'setup' | 'sign' | 'fault' | 'factor';

export function CRTFaultAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [pStr, setPStr] = useState('61');
  const [qStr, setQStr] = useState('53');
  const [eStr, setEStr] = useState('17');
  const [mStr, setMStr] = useState('42');
  const [error, setError] = useState('');

  const [n, setN] = useState<bigint | null>(null);
  const [dp, setDp] = useState<bigint | null>(null);
  const [dq, setDq] = useState<bigint | null>(null);
  const [correctSig, setCorrectSig] = useState<bigint | null>(null);
  const [faultySig, setFaultySig] = useState<bigint | null>(null);
  const [recoveredP, setRecoveredP] = useState<bigint | null>(null);
  const [recoveredQ, setRecoveredQ] = useState<bigint | null>(null);

  function doSetup() {
    setError('');
    const p = parseBigInt(pStr), q = parseBigInt(qStr), e = parseBigInt(eStr), m = parseBigInt(mStr);
    if (!p || !q || !e || m === null) { setError('Enter all parameters'); return; }
    const nVal = p * q;
    const phi = (p - 1n) * (q - 1n);
    const dVal = modInverse(e, phi);
    setN(nVal);
    setDp(mod(dVal, p - 1n));
    setDq(mod(dVal, q - 1n));

    // Correct CRT signature: sp = m^dp mod p, sq = m^dq mod q
    const sp = modPow(m, mod(dVal, p - 1n), p);
    const sq = modPow(m, mod(dVal, q - 1n), q);
    const qinv = modInverse(q, p);
    const sig = mod(sq + q * mod(qinv * (sp - sq), p), nVal);
    setCorrectSig(sig);
    setPhase('sign');
  }

  function doFault() {
    const p = parseBigInt(pStr)!, q = parseBigInt(qStr)!, m = parseBigInt(mStr)!;
    if (!n || !dp || !dq) return;

    // Faulty computation: inject a bit flip in sp (CRT component for p)
    const sp_correct = modPow(m, dp, p);
    // Flip a random bit to simulate hardware fault. randMod is CSPRNG-backed —
    // Math.random is banned repo-wide (see eslint config).
    const bitPos = BigInt(randMod(6));
    const sp_faulty = sp_correct ^ (1n << bitPos);

    const sq = modPow(m, dq, q);
    const qinv = modInverse(q, p);

    // Faulty signature using wrong sp but correct sq
    const sig_faulty = mod(sq + q * mod(qinv * (sp_faulty - sq), p), n);
    setFaultySig(sig_faulty);
    setPhase('fault');
  }

  function doFactor() {
    const e = parseBigInt(eStr)!, m = parseBigInt(mStr)!;
    if (!n || !correctSig || !faultySig) return;

    // The attack: gcd(sig_correct - sig_faulty, n) reveals p or q
    // Because: sig_correct ≡ sig_faulty (mod q) but sig_correct ≢ sig_faulty (mod p)
    // So gcd(sig_correct - sig_faulty, n) = q
    const diff = mod(correctSig - faultySig, n);
    const factor = gcd(diff < 0n ? -diff : diff, n);

    if (factor > 1n && factor < n) {
      setRecoveredP(n / factor);
      setRecoveredQ(factor);
    } else {
      // Try with sig^e - m
      const check = mod(modPow(faultySig, e, n) - m, n);
      const factor2 = gcd(check < 0n ? -check : check, n);
      if (factor2 > 1n && factor2 < n) {
        setRecoveredP(n / factor2);
        setRecoveredQ(factor2);
      } else {
        setError('Fault did not reveal factors — try again (random bit flip may have been trivial)');
        return;
      }
    }
    setPhase('factor');
  }

  const getStatus = usePhaseStatus<Phase>(['setup', 'sign', 'fault', 'factor'], phase);

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">CRT-RSA Fault Injection (Boneh-DeMillo-Lipton)</CardTitle>
          <CardDescription>
            A single-bit fault during CRT-RSA signing reveals p or q via GCD.
            Your RSA keygen computes dp, dq, qinv — this attack shows why hardware faults
            during CRT computation are catastrophic.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">RSA implementations often use CRT optimization for faster signing (4x speedup). A single computational fault during CRT signing leaks the entire private key.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">RSA-CRT computes s_p = m^d mod p and s_q = m^d mod q separately, then combines via CRT. If s_p has a fault but s_q is correct, the faulty signature is wrong mod p but correct mod q. Computing gcd(s^e - m, n) yields q, factoring n instantly with a single signature and a single GCD.</p>
      </div>

      <StepCard step={1} title="Setup: RSA-CRT Key" status={getStatus('setup')}>
        <p className="text-xs text-muted-foreground">
          Choose two primes p, q and a public exponent e. The CRT parameters dp = d mod (p-1) and dq = d mod (q-1) allow signing in each prime's field independently.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">p</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">q</Label><Input value={qStr} onChange={e => setQStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">e</Label><Input value={eStr} onChange={e => setEStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">m (message)</Label><Input value={mStr} onChange={e => setMStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Generate CRT Key + Correct Signature</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Correct CRT Signature" status={getStatus('sign')}>
        {correctSig !== null && n !== null && (
          <FormulaBox>
            <ComputationRow label="n" value={n.toString()} />
            <ComputationRow label="dp = d mod (p-1)" value={dp?.toString() || ''} />
            <ComputationRow label="dq = d mod (q-1)" value={dq?.toString() || ''} />
            <ComputationRow label="Correct sig" value={correctSig.toString()} highlight />
          </FormulaBox>
        )}
        <InlineWarning>Now we inject a hardware fault: flip a bit during the computation of sp = m^dp mod p.</InlineWarning>
        <Button onClick={doFault} className="w-full">Inject Fault (Flip Bit in sp)</Button>
      </StepCard>

      <StepCard step={3} title="Faulty Signature" status={getStatus('fault')}>
        {faultySig !== null && (
          <FormulaBox>
            <ComputationRow label="Faulty sig" value={faultySig.toString()} highlight />
            <ComputationRow label="Correct sig" value={correctSig?.toString() || ''} />
            <p className="text-xs text-muted-foreground mt-2">
              The fault only affected the p-component. So: faulty ≡ correct (mod q) but faulty ≢ correct (mod p).
              Therefore gcd(correct - faulty, n) = q.
            </p>
          </FormulaBox>
        )}
        <Button onClick={doFactor} className="w-full">Factor n via GCD</Button>
      </StepCard>

      <StepCard step={4} title="Factorization Recovered" status={getStatus('factor')}>
        {recoveredP !== null && recoveredQ !== null && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Recovered p" value={recoveredP.toString()} highlight />
              <ComputationRow label="Recovered q" value={recoveredQ.toString()} highlight />
              <ComputationRow label="Verify p×q" value={(recoveredP * recoveredQ).toString()} />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={(recoveredP * recoveredQ) === n ? 'destructive' : 'outline'}>
                  {(recoveredP * recoveredQ) === n ? 'n FACTORED' : 'MISMATCH'}
                </Badge>
              </div>
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Boneh-DeMillo-Lipton (1997)</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                CRT-RSA computes sp = m^dp mod p and sq = m^dq mod q separately, then combines.
                A fault in sp means the result is wrong mod p but correct mod q.
                gcd(sig_faulty^e - m, n) reveals q — one signature, one GCD, complete factorization.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Verify CRT output before releasing: check sig^e ≡ m (mod n).
                Hardware countermeasures include redundant computation and fault detection circuits.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
