import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { MatrixDisplay, VectorDisplay } from '@/components/StateMatrix';
import {
  generateLWEKeys,
  lweEncrypt,
  lweDecrypt,
  vecDot,
  type LWEKeyPair,
  type LWECiphertext,
} from '@/lib/lwe-math';

type Phase = 'setup' | 'keygen' | 'encrypt' | 'decrypt';

export function LWEWorkflow() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [nStr, setNStr] = useState('4');
  const [qStr, setQStr] = useState('97');
  const [keys, setKeys] = useState<LWEKeyPair | null>(null);
  const [setupError, setSetupError] = useState('');

  const [msgBit, setMsgBit] = useState('1');
  const [encResult, setEncResult] = useState<{ ct: LWECiphertext; r: number[]; rb: number } | null>(null);

  const [decResult, setDecResult] = useState<{ bit: number; raw: number; threshold: number } | null>(null);

  function doKeygen() {
    setSetupError('');
    const n = parseInt(nStr), q = parseInt(qStr);
    if (!n || n < 2 || n > 8) { setSetupError('n must be 2-8'); return; }
    if (!q || q < 17) { setSetupError('q must be >= 17'); return; }
    const k = generateLWEKeys(n, q);
    setKeys(k);
    setPhase('encrypt');
  }

  function doEncrypt() {
    if (!keys) return;
    const m = parseInt(msgBit);
    if (m !== 0 && m !== 1) return;
    const q = parseInt(qStr);
    const result = lweEncrypt(keys.A, keys.b, m, q);
    const rb = vecDot(result.r, keys.b, q);
    setEncResult({ ...result, rb });
    setPhase('decrypt');
  }

  function doDecrypt() {
    if (!encResult || !keys) return;
    const q = parseInt(qStr);
    const result = lweDecrypt(encResult.ct, keys.s, q);
    setDecResult(result);
  }

  const phaseOrder: Phase[] = ['setup', 'keygen', 'encrypt', 'decrypt'];
  const phaseIdx = phaseOrder.indexOf(phase);
  function getStatus(p: Phase): 'pending' | 'active' | 'complete' {
    const idx = phaseOrder.indexOf(p);
    if (idx < phaseIdx) return 'complete';
    if (idx === phaseIdx) return 'active';
    return 'pending';
  }

  const q = parseInt(qStr) || 97;

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Learning With Errors (LWE)</CardTitle>
          <CardDescription>
            Post-quantum cryptography foundation. LWE-based encryption is the basis for NIST's ML-KEM (CRYSTALS-Kyber)
            standard. The security relies on the hardness of distinguishing noisy linear equations from random.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-blue-600 dark:text-blue-400 space-y-1">
        <p className="font-semibold">Why Post-Quantum?</p>
        <p>RSA and ECC rely on integer factorization and discrete logarithms — both solvable by Shor's algorithm on a quantum computer.
        LWE is believed to be hard even for quantum computers. NIST standardized ML-KEM (based on Module-LWE) in 2024 as the replacement for classical key exchange.</p>
      </div>

      {/* Setup */}
      <StepCard step={1} title="Parameters" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">n (dimension, 2-8)</Label><Input value={nStr} onChange={e => setNStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">q (modulus)</Label><Input value={qStr} onChange={e => setQStr(e.target.value)} className="font-mono" /></div>
        </div>
        <p className="text-xs text-muted-foreground">Error distribution: small values from {'{-1, 0, 1}'}. In real ML-KEM, n=256 and q=3329.</p>
        <Button onClick={doKeygen} className="w-full">Generate Keys</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
      </StepCard>

      {/* Key Generation */}
      <StepCard step={2} title="Key Generation" status={getStatus('keygen')}>
        {keys && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 items-start">
              <MatrixDisplay matrix={keys.A} label="A (public matrix)" />
              <VectorDisplay values={keys.s} label="s (secret)" />
              <VectorDisplay values={keys.e} label="e (error)" />
              <VectorDisplay values={keys.b} label="b = As + e" />
            </div>
            <FormulaBox>
              <ComputationRow label="Public key" value={`(A, b)`} highlight />
              <ComputationRow label="Private key" value={`s = [${keys.s.join(', ')}]`} highlight />
              <ComputationRow label="Error" value={`e = [${keys.e.join(', ')}]`} />
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Without the error e, recovering s from (A, b) is trivial Gaussian elimination.
                  The small error makes this an NP-hard lattice problem.
                </p>
              </div>
            </FormulaBox>
          </div>
        )}
      </StepCard>

      {/* Encrypt */}
      <StepCard step={3} title="Encrypt a Bit" status={getStatus('encrypt')}>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs">Message bit m (0 or 1)</Label>
            <Input value={msgBit} onChange={e => setMsgBit(e.target.value)} className="font-mono" />
          </div>
        </div>
        <Button onClick={doEncrypt} className="w-full">Encrypt</Button>
        {encResult && keys && (
          <FormulaBox>
            <ComputationRow label="r (random binary)" value={`[${encResult.r.join(', ')}]`} />
            <ComputationRow label="u = r^T·A mod q" value={`[${encResult.ct.u.join(', ')}]`} />
            <ComputationRow label="r^T·b mod q" value={encResult.rb.toString()} />
            <ComputationRow label="floor(q/2)·m" value={`${Math.floor(q / 2)} × ${msgBit} = ${Math.floor(q / 2) * parseInt(msgBit)}`} />
            <ComputationRow label="v = r^T·b + floor(q/2)·m" value={encResult.ct.v.toString()} highlight />
            <div className="mt-2 pt-2 border-t">
              <ComputationRow label="Ciphertext" value={`(u=[${encResult.ct.u.join(',')}], v=${encResult.ct.v})`} highlight />
            </div>
          </FormulaBox>
        )}
      </StepCard>

      {/* Decrypt */}
      <StepCard step={4} title="Decrypt" status={getStatus('decrypt')}>
        <Button onClick={doDecrypt} className="w-full">Decrypt</Button>
        {decResult && encResult && keys && (
          <FormulaBox>
            <ComputationRow label="u·s mod q" value={vecDot(encResult.ct.u, keys.s, q).toString()} />
            <ComputationRow label="v - u·s mod q" value={decResult.raw.toString()} />
            <ComputationRow label="floor(q/2)" value={decResult.threshold.toString()} />
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">
                If result is closer to 0 → bit is 0. If closer to {decResult.threshold} → bit is 1.
              </p>
              <ComputationRow label="Decrypted bit" value={decResult.bit.toString()} highlight />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={decResult.bit === parseInt(msgBit) ? 'default' : 'destructive'}>
                  {decResult.bit === parseInt(msgBit) ? 'CORRECT' : 'DECRYPTION ERROR'}
                </Badge>
                <span className="text-xs font-mono">
                  Sent: {msgBit}, Received: {decResult.bit}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                The small error terms (from encryption randomness + key generation error) accumulate
                but stay small enough that decryption succeeds. If errors were too large, they could
                flip the bit — this is why parameter selection (n, q, error bound) is critical.
                For n={nStr}, q={qStr}, error ∈ {'{-1,0,1}'}, max accumulated noise ≈ n = {nStr}.
                Decryption succeeds when noise &lt; q/4 = {Math.floor(q / 4)}.
                Failure probability increases with n/q ratio — ML-KEM uses q=3329, n=256 with
                carefully tuned noise distribution to achieve 2^(-138) decryption failure rate.
              </p>
            </div>
          </FormulaBox>
        )}
      </StepCard>

      {/* Brute force scaling */}
      {keys && (
        <StepCard step={5} title="Brute-Force Attack Complexity" status={decResult ? 'active' : 'pending'}>
          {decResult && (() => {
            const n = parseInt(nStr), q = parseInt(qStr);
            const totalVectors = Math.pow(q, n);
            const canBrute = totalVectors <= 1_000_000;
            return (
              <div className="space-y-3">
                <FormulaBox>
                  <ComputationRow label="Secret space" value={`q^n = ${q}^${n} = ${totalVectors.toLocaleString()} vectors`} />
                  <ComputationRow label="Brute force" value={canBrute ? 'Feasible (< 1M vectors)' : `Infeasible (${totalVectors.toLocaleString()} vectors)`} highlight />
                </FormulaBox>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 px-2">n</th>
                        <th className="text-left py-1 px-2">q</th>
                        <th className="text-left py-1 px-2">Search space (q^n)</th>
                        <th className="text-left py-1 px-2">Time @ 10^9/sec</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { n: 4, q: 97 },
                        { n: 8, q: 97 },
                        { n: 16, q: 97 },
                        { n: 64, q: 3329 },
                        { n: 256, q: 3329 },
                      ].map(({ n: nn, q: qq }) => {
                        const logSpace = nn * Math.log10(qq);
                        const logTime = logSpace - 9;
                        let time: string;
                        if (logTime < 0) time = '< 1 second';
                        else if (logTime < 3) time = `~${Math.pow(10, logTime).toFixed(0)} seconds`;
                        else if (logTime < 10) time = `~10^${logTime.toFixed(0)} seconds`;
                        else time = `~10^${logTime.toFixed(0)} sec (heat death: 10^17)`;
                        return (
                          <tr key={`${nn}-${qq}`} className={`border-b ${nn === n && qq === q ? 'bg-primary/10' : ''}`}>
                            <td className="py-1 px-2">{nn}</td>
                            <td className="py-1 px-2">{qq}</td>
                            <td className="py-1 px-2">10^{logSpace.toFixed(1)}</td>
                            <td className="py-1 px-2">{time}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">
                  ML-KEM (CRYSTALS-Kyber) uses n=256, q=3329. Brute-forcing the secret requires
                  testing ~10^{(256 * Math.log10(3329)).toFixed(0)} vectors — far beyond any computer,
                  classical or quantum. This is why lattice problems are post-quantum secure.
                </p>
              </div>
            );
          })()}
        </StepCard>
      )}
    </div>
  );
}
