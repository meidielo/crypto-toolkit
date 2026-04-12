import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { parseBigInt } from '@/lib/parse';

// Continued fraction expansion of a/b
function continuedFraction(a: bigint, b: bigint): bigint[] {
  const cf: bigint[] = [];
  while (b !== 0n) {
    cf.push(a / b);
    [a, b] = [b, a % b];
  }
  return cf;
}

// Generate convergents from continued fraction
function convergents(cf: bigint[]): { num: bigint; den: bigint }[] {
  const results: { num: bigint; den: bigint }[] = [];
  let [h0, h1] = [0n, 1n];
  let [k0, k1] = [1n, 0n];
  for (const a of cf) {
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    results.push({ num: h2, den: k2 });
    [h0, h1] = [h1, h2];
    [k0, k1] = [k1, k2];
  }
  return results;
}

// Check if x is a perfect square
function isqrt(n: bigint): bigint | null {
  if (n < 0n) return null;
  if (n === 0n) return 0n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x * x === n ? x : null;
}

export function WienerAttack() {
  const [phase, setPhase] = useState<'setup' | 'attack' | 'result'>('setup');
  // Example: p=101, q=113, n=11413, e=7467, d=23 (d < n^(1/4)/3 ≈ 3.4, so 23 > 3.4 — need bigger n)
  // Better: p=1009, q=3643, n=3675787, e=2173589, d=89 — d is small enough
  const [nStr, setNStr] = useState('3675787');
  const [eStr, setEStr] = useState('2173589');
  const [error, setError] = useState('');

  const [cfTerms, setCfTerms] = useState<bigint[]>([]);
  const [convList, setConvList] = useState<{ num: bigint; den: bigint; isD: boolean }[]>([]);
  const [recoveredD, setRecoveredD] = useState<bigint | null>(null);
  const [recoveredP, setRecoveredP] = useState<bigint | null>(null);
  const [recoveredQ, setRecoveredQ] = useState<bigint | null>(null);

  function doAttack() {
    setError('');
    setRecoveredD(null);
    const n = parseBigInt(nStr), e = parseBigInt(eStr);
    if (!n || !e) { setError('Enter n and e'); return; }
    if (n < 4n) { setError('n too small'); return; }

    // Continued fraction expansion of e/n
    const cf = continuedFraction(e, n);
    setCfTerms(cf);

    // Check each convergent k/d
    const convs = convergents(cf);
    const results: typeof convList = [];
    let found = false;

    for (const { num: k, den: d } of convs) {
      if (k === 0n || d === 0n) { results.push({ num: k, den: d, isD: false }); continue; }

      // If d is correct private key, then ed ≡ 1 mod φ(n)
      // So φ(n) = (ed - 1) / k
      const ed_minus_1 = e * d - 1n;
      if (ed_minus_1 % k !== 0n) { results.push({ num: k, den: d, isD: false }); continue; }

      const phi = ed_minus_1 / k;

      // φ(n) = n - p - q + 1, so p + q = n - phi + 1
      const pqSum: bigint = n - phi + 1n;
      // p and q are roots of x² - sx + n = 0
      // discriminant = s² - 4n
      const disc: bigint = pqSum * pqSum - 4n * n;
      const sqrtDisc = isqrt(disc);

      if (sqrtDisc !== null && sqrtDisc >= 0n) {
        const pCandidate: bigint = (pqSum + sqrtDisc) / 2n;
        const qCandidate: bigint = (pqSum - sqrtDisc) / 2n;
        if (pCandidate * qCandidate === n && pCandidate > 1n && qCandidate > 1n) {
          results.push({ num: k, den: d, isD: true });
          if (!found) {
            setRecoveredD(d);
            setRecoveredP(pCandidate);
            setRecoveredQ(qCandidate);
            found = true;
          }
          continue;
        }
      }
      results.push({ num: k, den: d, isD: false });
    }
    setConvList(results);
    setPhase(found ? 'result' : 'attack');
    if (!found) setError('Attack failed — d may not be small enough. Wiener requires d < n^(1/4) / 3.');
  }

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Wiener's Attack on RSA (Small d)</CardTitle>
          <CardDescription>
            When the RSA private exponent d &lt; n^(1/4) / 3, the continued fraction expansion
            of e/n reveals d as a convergent. This recovers the private key from only (n, e).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">RSA with a small private exponent d (used for fast decryption) is insecure.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">Wiener's attack exploits the continued fraction expansion of e/n. When d &lt; n<sup>1/4</sup>/3, one of the convergents of e/n equals k/d, directly revealing the private key. The attack is pure number theory — no factoring needed.</p>
      </div>

      <StepCard step={1} title="Input: Public Key (n, e)" status={phase === 'setup' ? 'active' : 'complete'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">n (modulus)</Label><Input value={nStr} onChange={e => setNStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">e (public exponent)</Label><Input value={eStr} onChange={e => setEStr(e.target.value)} className="font-mono" /></div>
        </div>
        <p className="text-xs text-muted-foreground">Default: n=3675787=1009x3643, e=2173589, d=89 (small d vulnerable to Wiener)</p>
        <Button onClick={doAttack} className="w-full">Run Wiener's Attack (Continued Fractions)</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {cfTerms.length > 0 && (
        <StepCard step={2} title="Continued Fraction of e/n" status={phase === 'setup' ? 'active' : 'complete'}>
          <FormulaBox>
            <ComputationRow label="CF[e/n]" value={`[${cfTerms.slice(0, 20).map(t => t.toString()).join(', ')}${cfTerms.length > 20 ? ', ...' : ''}]`} />
            <ComputationRow label="Terms" value={cfTerms.length.toString()} />
          </FormulaBox>

          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left py-1 px-2">#</th>
                  <th className="text-left py-1 px-2">k</th>
                  <th className="text-left py-1 px-2">d</th>
                  <th className="text-left py-1 px-2">Match?</th>
                </tr>
              </thead>
              <tbody>
                {convList.slice(0, 30).map((c, i) => (
                  <tr key={i} className={`border-b ${c.isD ? 'bg-red-500/20' : ''}`}>
                    <td className="py-0.5 px-2">{i}</td>
                    <td className="py-0.5 px-2">{c.num.toString()}</td>
                    <td className="py-0.5 px-2">{c.den.toString()}</td>
                    <td className="py-0.5 px-2">
                      {c.isD && <Badge variant="destructive" className="text-[10px]">d FOUND</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StepCard>
      )}

      {recoveredD && (
        <StepCard step={3} title="Private Key Recovered" status="active">
          <FormulaBox>
            <ComputationRow label="d (recovered)" value={recoveredD.toString()} highlight />
            <ComputationRow label="p" value={recoveredP!.toString()} highlight />
            <ComputationRow label="q" value={recoveredQ!.toString()} highlight />
            <ComputationRow label="Verify: p×q" value={(recoveredP! * recoveredQ!).toString()} />
            <div className="mt-2 pt-2 border-t flex items-center gap-2">
              <Badge variant="destructive">PRIVATE KEY RECOVERED</Badge>
            </div>
          </FormulaBox>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Works</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70">
              When d is small, e/n ≈ k/d for some small k (since ed = 1 + kφ(n) and φ(n) ≈ n).
              The continued fraction expansion of e/n produces convergents that include k/d.
              From k and d, we compute φ(n) = (ed-1)/k, then factor n via the quadratic formula.
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70">
              <strong>Fix:</strong> Choose d ≥ n^(1/2). Standard RSA key generation (e=65537)
              naturally produces large d. Never manually choose a small d for "performance."
            </p>
          </div>
        </StepCard>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">Limitations & real-world context</p>
        <p>This demo uses a small modulus for visibility. Real RSA uses 2048+ bit keys, but the continued fraction attack scales — it depends only on the ratio d/n<sup>1/4</sup>, not on n's absolute size.</p>
        <p>Wiener's bound (d &lt; n<sup>1/4</sup>/3) was later improved by Boneh and Durfee (1999) to d &lt; n<sup>0.292</sup> using lattice techniques. Standard RSA key generation with e=65537 naturally produces a large d (close to n in size), so this attack does not apply to correctly generated keys.</p>
        <p>The attack recovers not just d but also the factorization of n (p and q), since knowing d and e allows computing phi(n) and solving a quadratic. This is a complete key compromise from only the public key (n, e).</p>
      </div>
    </div>
  );
}
