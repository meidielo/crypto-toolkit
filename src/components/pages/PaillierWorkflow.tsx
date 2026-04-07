import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { mod, modPow, modInverse, lcm, gcd, isPrime, paillierL } from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try { const t = s.trim(); if (!t || t.length > 2000) return null; return BigInt(t); } catch { return null; }
}

type Phase = 'keygen' | 'encrypt' | 'homomorphic' | 'decrypt';

export function PaillierWorkflow() {
  const [phase, setPhase] = useState<Phase>('keygen');

  // Keygen
  const [pStr, setPStr] = useState('107');
  const [qStr, setQStr] = useState('61');
  const [gStr, setGStr] = useState('7019');
  const [keyResult, setKeyResult] = useState<{
    n: bigint; nSq: bigint; lambda: bigint; u: bigint; lU: bigint; mu: bigint;
  } | null>(null);
  const [keyError, setKeyError] = useState('');

  // Encrypt
  const [mStr, setMStr] = useState('42');
  const [rStr, setRStr] = useState('71');
  const [encResult, setEncResult] = useState<{
    gm: bigint; rn: bigint; c: bigint;
  } | null>(null);

  // Homomorphic
  const [ciphertexts, setCiphertexts] = useState<string>('');
  const [homoResult, setHomoResult] = useState<{ product: bigint; decrypted: bigint } | null>(null);

  // Decrypt
  const [decCStr, setDecCStr] = useState('');
  const [decResult, setDecResult] = useState<{
    cLambda: bigint; lVal: bigint; m: bigint;
  } | null>(null);

  function doKeygen() {
    setKeyError('');
    const p = parseBigInt(pStr), q = parseBigInt(qStr), g = parseBigInt(gStr);
    if (!p || !q || !g) { setKeyError('Enter p, q, and g'); return; }
    if (!isPrime(p) || !isPrime(q)) { setKeyError('p and q must be prime'); return; }
    if (p === q) { setKeyError('p and q must be different'); return; }
    try {
      const n = p * q;
      const nSq = n * n;
      const lambda = lcm(p - 1n, q - 1n);
      const u = modPow(g, lambda, nSq);
      const lU = paillierL(u, n);
      if (gcd(lU, n) !== 1n) { setKeyError(`L(u) = ${lU} is not coprime to n = ${n}. Choose a different generator g.`); return; }
      const mu = modInverse(lU, n);
      setKeyResult({ n, nSq, lambda, u, lU, mu });
      setPhase('encrypt');
    } catch (e) { setKeyError(String(e)); }
  }

  function doEncrypt() {
    if (!keyResult) return;
    const m = parseBigInt(mStr), r = parseBigInt(rStr);
    if (m === null || !r) return;
    const { n, nSq } = keyResult;
    const g = parseBigInt(gStr)!;
    if (gcd(r, n) !== 1n) { return; }
    const gm = modPow(g, m, nSq);
    const rn = modPow(r, n, nSq);
    const c = mod(gm * rn, nSq);
    setEncResult({ gm, rn, c });
    setDecCStr(c.toString());
    setPhase('homomorphic');
  }

  function doHomomorphic() {
    if (!keyResult) return;
    const { nSq, lambda, mu, n } = keyResult;
    const parts = ciphertexts.split(',').map(s => parseBigInt(s.trim())).filter(Boolean) as bigint[];
    if (parts.length < 2) return;
    let product = 1n;
    for (const c of parts) product = mod(product * c, nSq);
    // Decrypt the product
    const cLambda = modPow(product, lambda, nSq);
    const lVal = paillierL(cLambda, n);
    const decrypted = mod(lVal * mu, n);
    setHomoResult({ product, decrypted });
    setPhase('decrypt');
  }

  function doDecrypt() {
    if (!keyResult) return;
    const c = parseBigInt(decCStr);
    if (!c) return;
    const { lambda, mu, n, nSq } = keyResult;
    const cLambda = modPow(c, lambda, nSq);
    const lVal = paillierL(cLambda, n);
    const m = mod(lVal * mu, n);
    setDecResult({ cLambda, lVal, m });
  }

  const phaseOrder: Phase[] = ['keygen', 'encrypt', 'homomorphic', 'decrypt'];
  const phaseIdx = phaseOrder.indexOf(phase);
  function getStatus(p: Phase): 'pending' | 'active' | 'complete' {
    const idx = phaseOrder.indexOf(p);
    if (idx < phaseIdx) return 'complete';
    if (idx === phaseIdx) return 'active';
    return 'pending';
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Paillier Cryptosystem Workflow</CardTitle>
          <CardDescription>
            Additive homomorphic encryption. Multiply ciphertexts to add plaintexts without decrypting.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Step 1: Key Generation */}
      <StepCard step={1} title="Key Generation" status={getStatus('keygen')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">p (prime)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">q (prime)</Label><Input value={qStr} onChange={e => setQStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">g (generator)</Label><Input value={gStr} onChange={e => setGStr(e.target.value)} className="font-mono" /></div>
        </div>
        <p className="text-xs text-muted-foreground">Tip: g = n+1 always works and simplifies L(g^λ mod n²) = λ. Custom g must satisfy gcd(L(g^λ mod n²), n) = 1.</p>
        <Button onClick={doKeygen} className="w-full">Generate Keys</Button>
        {keyError && <p className="text-sm text-destructive">{keyError}</p>}
        {keyResult && (
          <FormulaBox>
            <ComputationRow label="n = p×q" value={keyResult.n.toString()} />
            <ComputationRow label="n²" value={keyResult.nSq.toString()} />
            <ComputationRow label="λ" formula="lcm(p-1, q-1)" value={keyResult.lambda.toString()} />
            <ComputationRow label="u" formula="g^λ mod n²" value={keyResult.u.toString()} />
            <ComputationRow label="L(u)" formula="(u-1)/n" value={keyResult.lU.toString()} />
            <ComputationRow label="μ" formula="L(u)⁻¹ mod n" value={keyResult.mu.toString()} />
            <div className="mt-2 pt-2 border-t">
              <ComputationRow label="Public key" value={`(n, g) = (${keyResult.n}, ${gStr})`} highlight />
              <ComputationRow label="Private key" value={`(λ, μ) = (${keyResult.lambda}, ${keyResult.mu})`} highlight />
            </div>
          </FormulaBox>
        )}
      </StepCard>

      {/* Step 2: Encrypt */}
      <StepCard step={2} title="Encrypt a Message" status={getStatus('encrypt')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">m (message integer)</Label><Input value={mStr} onChange={e => setMStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">r (random, gcd(r,n)=1)</Label><Input value={rStr} onChange={e => setRStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doEncrypt} className="w-full">Encrypt: E(m) = g^m · r^n mod n²</Button>
        {encResult && (
          <FormulaBox>
            <ComputationRow label="g^m mod n²" value={encResult.gm.toString()} />
            <ComputationRow label="r^n mod n²" value={encResult.rn.toString()} />
            <ComputationRow label="c = g^m · r^n mod n²" value={encResult.c.toString()} highlight />
          </FormulaBox>
        )}
      </StepCard>

      {/* Step 3: Homomorphic Addition */}
      <StepCard step={3} title="Homomorphic Addition" status={getStatus('homomorphic')}>
        <div>
          <Label className="text-xs">Ciphertexts (comma-separated)</Label>
          <Input value={ciphertexts} onChange={e => setCiphertexts(e.target.value)} className="font-mono" placeholder="c1, c2, c3..." />
          <p className="text-xs text-muted-foreground mt-1">E(m₁) × E(m₂) mod n² = E(m₁ + m₂)</p>
        </div>
        <Button onClick={doHomomorphic} className="w-full">Compute Homomorphic Sum</Button>
        {homoResult && (
          <FormulaBox>
            <ComputationRow label="Product mod n²" value={homoResult.product.toString()} />
            <ComputationRow label="Decrypted sum" value={homoResult.decrypted.toString()} highlight />
          </FormulaBox>
        )}
      </StepCard>

      {/* Step 4: Decrypt */}
      <StepCard step={4} title="Decrypt a Ciphertext" status={getStatus('decrypt')}>
        <div><Label className="text-xs">Ciphertext c</Label><Input value={decCStr} onChange={e => setDecCStr(e.target.value)} className="font-mono" /></div>
        <Button onClick={doDecrypt} className="w-full">Decrypt: m = L(c^λ mod n²) · μ mod n</Button>
        {decResult && (
          <FormulaBox>
            <ComputationRow label="c^λ mod n²" value={decResult.cLambda.toString()} />
            <ComputationRow label="L(c^λ mod n²)" formula="(c^λ mod n² - 1)/n" value={decResult.lVal.toString()} />
            <ComputationRow label="m" formula="L(·) × μ mod n" value={decResult.m.toString()} highlight />
          </FormulaBox>
        )}
      </StepCard>
    </div>
  );
}
