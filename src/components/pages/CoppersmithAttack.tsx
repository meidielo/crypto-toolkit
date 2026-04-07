import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { modPow } from '@/lib/ec-math';
import { parseBigInt } from '@/lib/parse';

// Integer cube root (Newton's method for BigInt)
function icbrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  let x = 1n;
  // Initial guess
  const bits = n.toString(2).length;
  x = 1n << BigInt(Math.ceil(bits / 3));
  while (true) {
    const x1 = (2n * x + n / (x * x)) / 3n;
    if (x1 >= x) break;
    x = x1;
  }
  // Fine-tune
  while ((x + 1n) * (x + 1n) * (x + 1n) <= n) x++;
  return x;
}

type Phase = 'setup' | 'encrypt' | 'attack';

export function CoppersmithAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [mStr, setMStr] = useState('42');
  const [n1Str, setN1Str] = useState('3233');  // 61 × 53
  const [n2Str, setN2Str] = useState('4559');  // 47 × 97
  const [n3Str, setN3Str] = useState('5767');  // 53 × 109 (different from n1's factors)
  const [error, setError] = useState('');

  const [ciphertexts, setCiphertexts] = useState<bigint[]>([]);
  const [recovered, setRecovered] = useState<bigint | null>(null);
  const [crtValue, setCrtValue] = useState<bigint | null>(null);

  function doEncrypt() {
    setError('');
    const m = parseBigInt(mStr), n1 = parseBigInt(n1Str), n2 = parseBigInt(n2Str), n3 = parseBigInt(n3Str);
    if (m === null || !n1 || !n2 || !n3) { setError('Enter all parameters'); return; }
    // e = 3 (small public exponent)
    const c1 = modPow(m, 3n, n1);
    const c2 = modPow(m, 3n, n2);
    const c3 = modPow(m, 3n, n3);
    setCiphertexts([c1, c2, c3]);
    setPhase('encrypt');
  }

  function doAttack() {
    const n1 = parseBigInt(n1Str)!, n2 = parseBigInt(n2Str)!, n3 = parseBigInt(n3Str)!;
    const [c1, c2, c3] = ciphertexts;

    // CRT: find x such that x ≡ c1 (mod n1), x ≡ c2 (mod n2), x ≡ c3 (mod n3)
    const N = n1 * n2 * n3;
    const N1 = N / n1, N2 = N / n2, N3 = N / n3;

    // Extended Euclidean for modular inverses
    function modInv(a: bigint, m: bigint): bigint {
      let [old_r, r] = [a % m, m];
      let [old_s, s] = [1n, 0n];
      while (r !== 0n) {
        const q = old_r / r;
        [old_r, r] = [r, old_r - q * r];
        [old_s, s] = [s, old_s - q * s];
      }
      return ((old_s % m) + m) % m;
    }

    const y1 = modInv(N1, n1);
    const y2 = modInv(N2, n2);
    const y3 = modInv(N3, n3);

    const x = (c1 * N1 * y1 + c2 * N2 * y2 + c3 * N3 * y3) % N;
    setCrtValue(x);

    // x = m³ (exact integer, not modular). Take integer cube root.
    const m = icbrt(x);
    setRecovered(m * m * m === x ? m : null);
    setPhase('attack');
  }

  const phaseOrder: Phase[] = ['setup', 'encrypt', 'attack'];
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
          <CardTitle className="text-lg">Hastad's Broadcast Attack (e=3)</CardTitle>
          <CardDescription>
            When the same message is encrypted with RSA e=3 to 3 different recipients, CRT
            recovers m³ exactly (no modular reduction), and cube root reveals m.
            Complement to Wiener's attack — shows the other side of bad RSA parameters.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Encrypt m with e=3 to 3 Recipients" status={getStatus('setup')}>
        <InlineWarning>
          Same message m encrypted with e=3 under 3 different moduli n₁, n₂, n₃.
          Since m³ &lt; n₁×n₂×n₃, CRT recovers m³ as a plain integer.
        </InlineWarning>
        <div><Label className="text-xs">m (message, must be small: m³ &lt; n₁×n₂×n₃)</Label><Input value={mStr} onChange={e => setMStr(e.target.value)} className="font-mono" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">n₁</Label><Input value={n1Str} onChange={e => setN1Str(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">n₂</Label><Input value={n2Str} onChange={e => setN2Str(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">n₃</Label><Input value={n3Str} onChange={e => setN3Str(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doEncrypt} className="w-full">Encrypt (e=3 to all 3)</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Attacker Collects 3 Ciphertexts" status={getStatus('encrypt')}>
        {ciphertexts.length === 3 && (
          <FormulaBox>
            <ComputationRow label="c₁ = m³ mod n₁" value={ciphertexts[0].toString()} />
            <ComputationRow label="c₂ = m³ mod n₂" value={ciphertexts[1].toString()} />
            <ComputationRow label="c₃ = m³ mod n₃" value={ciphertexts[2].toString()} />
          </FormulaBox>
        )}
        <Button onClick={doAttack} className="w-full">Apply CRT + Cube Root</Button>
      </StepCard>

      <StepCard step={3} title="CRT Recovery" status={getStatus('attack')}>
        {crtValue !== null && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="CRT: m³" value={crtValue.toString()} highlight />
              <ComputationRow label="∛(m³)" value={recovered?.toString() || 'Not a perfect cube'} highlight />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={recovered?.toString() === mStr ? 'destructive' : 'outline'}>
                  {recovered?.toString() === mStr ? 'MESSAGE RECOVERED' : 'FAILED'}
                </Badge>
              </div>
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Works</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                For e=3 and 3 moduli, CRT gives m³ mod (n₁×n₂×n₃). Since m &lt; min(nᵢ),
                m³ &lt; n₁×n₂×n₃, so the CRT result IS m³ as a plain integer (no modular wrap).
                Integer cube root recovers m directly.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Use OAEP padding (adds randomness, so each recipient gets
                a different padded message). Or use e=65537 (need 65537 ciphertexts — infeasible).
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
