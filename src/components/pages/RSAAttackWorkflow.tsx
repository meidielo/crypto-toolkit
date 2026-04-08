import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { mod, modPow, modInverse, gcd } from '@/lib/crypto-math';


function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('sqrt of negative');
  if (n === 0n) return 0n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}

export function RSAAttackWorkflow() {
  const [nStr, setNStr] = useState('10009999019');
  const [eStr, setEStr] = useState('65537');
  const [cStr, setCStr] = useState('1880434495');
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<{
    sqrtN: bigint;
    p: bigint; q: bigint;
    phi: bigint;
    gcdCheck: bigint;
    d: bigint;
    m: bigint;
    cVerify: bigint;
    verified: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  function doAttack() {
    setError('');
    setResult(null);
    const n = parseBigInt(nStr), e = parseBigInt(eStr), C = parseBigInt(cStr);
    if (!n || !e || !C) { setError('Enter n, e, and C'); return; }
    if (n < 4n) { setError('n too small'); return; }

    setComputing(true);
    setTimeout(() => {
      try {
        const sqrtN = isqrt(n);

        // Trial division from 2 upward (faster for educational-size numbers)
        let p = 0n, q = 0n;
        if (n % 2n === 0n) { p = 2n; q = n / 2n; }
        else {
          for (let i = 3n; i <= sqrtN; i += 2n) {
            if (n % i === 0n) { p = i; q = n / i; break; }
          }
        }
        if (p === 0n) { setError('Could not factor n'); setComputing(false); return; }

        // Ensure p <= q
        if (p > q) [p, q] = [q, p];

        const phi = (p - 1n) * (q - 1n);
        const gcdCheck = gcd(e, phi);
        const d = modInverse(e, phi);
        const m = modPow(C, d, n);
        const cVerify = modPow(m, e, n);

        setResult({
          sqrtN, p, q, phi, gcdCheck, d, m, cVerify, verified: cVerify === C,
        });
      } catch (err) {
        setError(String(err));
      }
      setComputing(false);
    }, 10);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">RSA Attack Workflow</CardTitle>
          <CardDescription>
            Given public key (n, e) and ciphertext C, factor n to recover the private key and decrypt.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Input: Public Key & Ciphertext" status={result ? 'complete' : 'active'}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">n (modulus)</Label><Input value={nStr} onChange={e => setNStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">e (public exponent)</Label><Input value={eStr} onChange={e => setEStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">C (ciphertext)</Label><Input value={cStr} onChange={e => setCStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doAttack} disabled={computing} className="w-full">
          {computing ? 'Factoring...' : 'Attack: Factor n & Decrypt'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {result && (
        <>
          <StepCard step={2} title="Factor n" status="complete">
            <FormulaBox>
              <ComputationRow label="√n" formula="≈" value={result.sqrtN.toString()} />
              <ComputationRow label="p" value={result.p.toString()} highlight />
              <ComputationRow label="q" formula="n/p" value={result.q.toString()} highlight />
              <ComputationRow label="Verify" formula="p × q" value={(result.p * result.q).toString()} />
            </FormulaBox>
          </StepCard>

          <StepCard step={3} title="Compute Private Key" status="complete">
            <FormulaBox>
              <ComputationRow label="φ(n)" formula="(p-1)(q-1)" value={result.phi.toString()} />
              <ComputationRow label="gcd(e, φ(n))" value={result.gcdCheck.toString()} />
              <ComputationRow label="d" formula="e⁻¹ mod φ(n)" value={result.d.toString()} highlight />
              <p className="text-xs text-muted-foreground mt-1">Verify: (e × d) mod φ(n) = {mod(parseBigInt(eStr)! * result.d, result.phi).toString()}</p>
            </FormulaBox>
          </StepCard>

          <StepCard step={4} title="Decrypt & Verify" status="complete">
            <FormulaBox>
              <ComputationRow label="M" formula="C^d mod n" value={result.m.toString()} highlight />
              <ComputationRow label="C'" formula="M^e mod n" value={result.cVerify.toString()} />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={result.verified ? 'default' : 'destructive'}>
                  {result.verified ? 'VERIFIED' : 'MISMATCH'}
                </Badge>
                <span className="text-sm">C' = {result.cVerify.toString()} {result.verified ? '==' : '!='} C = {cStr}</span>
              </div>
            </FormulaBox>
          </StepCard>
        </>
      )}
    </div>
  );
}
