import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { modPow } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { parseBigInt } from '@/lib/parse';

type Phase = 'setup' | 'attack' | 'result';

export function DHSubgroupAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [pStr, setPStr] = useState('23');
  const [gStr, setGStr] = useState('5');
  const [secretStr, setSecretStr] = useState('7');
  const [error, setError] = useState('');

  const [legitimatePub, setLegitimatePub] = useState<bigint | null>(null);
  const [attackResults, setAttackResults] = useState<{
    maliciousG: bigint;
    order: bigint;
    victimPub: bigint;
    sharedSecret: bigint;
    recoveredMod: bigint;
    explanation: string;
  }[]>([]);

  function doSetup() {
    setError('');
    const p = parseBigInt(pStr), g = parseBigInt(gStr), secret = parseBigInt(secretStr);
    if (!p || !g || !secret) { setError('Enter all parameters'); return; }
    if (!isPrime(p)) { setError('p must be prime'); return; }
    setLegitimatePub(modPow(g, secret, p));
    setPhase('attack');
  }

  function doAttack() {
    const p = parseBigInt(pStr)!, secret = parseBigInt(secretStr)!;
    const results: typeof attackResults = [];

    // Attack 1: g = 1 (trivial subgroup, order 1)
    const g1 = 1n;
    const pub1 = modPow(g1, secret, p); // Always 1
    results.push({
      maliciousG: g1,
      order: 1n,
      victimPub: pub1,
      sharedSecret: modPow(pub1, secret, p),
      recoveredMod: 0n,
      explanation: 'g=1: every power is 1. Shared secret is always 1 regardless of private key.',
    });

    // Attack 2: g = p-1 (order 2)
    const g2 = p - 1n;
    const pub2 = modPow(g2, secret, p); // Either 1 or p-1
    results.push({
      maliciousG: g2,
      order: 2n,
      victimPub: pub2,
      sharedSecret: modPow(pub2, secret, p),
      recoveredMod: pub2 === 1n ? 0n : 1n,
      explanation: `g=p-1: has order 2. Victim's public key reveals secret mod 2 = ${pub2 === 1n ? '0 (even)' : '1 (odd)'}.`,
    });

    // Attack 3: find a small-order element
    // For p=23, p-1=22=2*11. Elements of order 11 exist.
    const pMinus1 = p - 1n;
    // Find factors of p-1
    for (let factor = 2n; factor * factor <= pMinus1; factor++) {
      if (pMinus1 % factor === 0n) {
        const smallOrder = factor;
        // Find element of this order: g3 = random^((p-1)/factor) mod p
        const g3 = modPow(2n, pMinus1 / smallOrder, p);
        if (g3 !== 1n && modPow(g3, smallOrder, p) === 1n) {
          const pub3 = modPow(g3, secret, p);
          // Brute-force secret mod smallOrder
          let recovered = 0n;
          for (let k = 0n; k < smallOrder; k++) {
            if (modPow(g3, k, p) === pub3) { recovered = k; break; }
          }
          results.push({
            maliciousG: g3,
            order: smallOrder,
            victimPub: pub3,
            sharedSecret: modPow(pub3, secret, p),
            recoveredMod: recovered,
            explanation: `g=${g3}: has order ${smallOrder}. Leaked: secret ≡ ${recovered} (mod ${smallOrder}).`,
          });
          break;
        }
      }
    }

    setAttackResults(results);
    setPhase('result');
  }

  const getStatus = usePhaseStatus<Phase>(['setup', 'attack', 'result'], phase);

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Diffie-Hellman Small Subgroup Attack</CardTitle>
          <CardDescription>
            An attacker sends a malicious generator with small order. The victim's public key
            then leaks their private key modulo that small order. By combining several small-order
            attacks via CRT, the full private key can be recovered.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup: Legitimate DH Parameters" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">p (prime)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">g (generator)</Label><Input value={gStr} onChange={e => setGStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Secret key (victim)</Label><Input value={secretStr} onChange={e => setSecretStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Setup</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {legitimatePub !== null && (
          <FormulaBox>
            <ComputationRow label="Legitimate pub" formula="g^secret mod p" value={legitimatePub.toString()} />
          </FormulaBox>
        )}
      </StepCard>

      <StepCard step={2} title="Attack: Send Malicious Generators" status={getStatus('attack')}>
        <InlineWarning>
          The attacker replaces g with elements of small order. The victim computes g_malicious^secret
          without validating the generator — leaking bits of the secret.
        </InlineWarning>
        <Button onClick={doAttack} className="w-full">Run Small Subgroup Attacks</Button>
      </StepCard>

      <StepCard step={3} title="Results: Private Key Bits Leaked" status={getStatus('result')}>
        {attackResults.length > 0 && (
          <div className="space-y-3">
            {attackResults.map((r, i) => (
              <FormulaBox key={i}>
                <ComputationRow label="Malicious g" value={r.maliciousG.toString()} />
                <ComputationRow label="Order" value={r.order.toString()} />
                <ComputationRow label="Victim's pub" formula={`g^${secretStr} mod ${pStr}`} value={r.victimPub.toString()} />
                <ComputationRow label="Recovered" value={`secret ≡ ${r.recoveredMod} (mod ${r.order})`} highlight />
                <p className="text-xs text-muted-foreground mt-1">{r.explanation}</p>
              </FormulaBox>
            ))}

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Combining with CRT</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                Each small-order attack reveals secret mod (order). Using the Chinese Remainder Theorem,
                an attacker combines these to recover secret mod (product of orders). If the product
                covers the full group order, the entire private key is recovered.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Always validate that received DH public keys are in the correct
                prime-order subgroup: check 1 &lt; key &lt; p and key^q ≡ 1 mod p (where q is the
                subgroup order). Use safe primes (p = 2q + 1) or elliptic curves where cofactor = 1.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
