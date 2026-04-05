import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  mod,
  modPow,
  modInverse,
  gcd,
  lcm,
  extendedGcd,
  eulerTotient,
  legendreSymbol,
  sqrtModP,
  isPrime,
} from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try {
    const t = s.trim();
    if (!t) return null;
    if (t.startsWith('-')) return -BigInt(t.slice(1));
    return BigInt(t);
  } catch {
    return null;
  }
}

interface CalcCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function CalcCard({ title, description, children }: CalcCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ResultBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/50 p-2.5 flex items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className="font-mono text-sm break-all">{value}</span>
    </div>
  );
}

export function ModularArithmetic() {
  // Mod Inverse
  const [invA, setInvA] = useState('');
  const [invM, setInvM] = useState('');
  const [invResult, setInvResult] = useState('');
  const [invError, setInvError] = useState('');

  // Mod Power
  const [powBase, setPowBase] = useState('');
  const [powExp, setPowExp] = useState('');
  const [powMod, setPowMod] = useState('');
  const [powResult, setPowResult] = useState('');

  // GCD / Extended GCD
  const [gcdA, setGcdA] = useState('');
  const [gcdB, setGcdB] = useState('');
  const [gcdResult, setGcdResult] = useState('');

  // Euler Totient
  const [totN, setTotN] = useState('');
  const [totResult, setTotResult] = useState('');

  // Sqrt mod p
  const [sqrtA, setSqrtA] = useState('');
  const [sqrtP, setSqrtP] = useState('');
  const [sqrtResult, setSqrtResult] = useState('');
  const [sqrtError, setSqrtError] = useState('');

  // Legendre
  const [legA, setLegA] = useState('');
  const [legP, setLegP] = useState('');
  const [legResult, setLegResult] = useState('');

  // Primality
  const [primeN, setPrimeN] = useState('');
  const [primeResult, setPrimeResult] = useState('');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Modular Inverse */}
      <CalcCard title="Modular Inverse" description="Find a⁻¹ mod m such that a × a⁻¹ ≡ 1 (mod m)">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">a</Label>
            <Input value={invA} onChange={e => setInvA(e.target.value)} className="font-mono" placeholder="3" />
          </div>
          <div>
            <Label className="text-xs">m</Label>
            <Input value={invM} onChange={e => setInvM(e.target.value)} className="font-mono" placeholder="26" />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            setInvError('');
            const a = parseBigInt(invA), m = parseBigInt(invM);
            if (!a || !m) return;
            try {
              setInvResult(modInverse(a, m).toString());
            } catch (e) {
              setInvError(String(e));
              setInvResult('');
            }
          }}
        >
          Calculate
        </Button>
        {invError && <p className="text-xs text-destructive">{invError}</p>}
        {invResult && <ResultBox label="a⁻¹ mod m" value={invResult} />}
      </CalcCard>

      {/* Modular Exponentiation */}
      <CalcCard title="Modular Exponentiation" description="Compute base^exp mod m efficiently">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">base</Label>
            <Input value={powBase} onChange={e => setPowBase(e.target.value)} className="font-mono" placeholder="2" />
          </div>
          <div>
            <Label className="text-xs">exp</Label>
            <Input value={powExp} onChange={e => setPowExp(e.target.value)} className="font-mono" placeholder="10" />
          </div>
          <div>
            <Label className="text-xs">mod</Label>
            <Input value={powMod} onChange={e => setPowMod(e.target.value)} className="font-mono" placeholder="1000" />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const b = parseBigInt(powBase), e = parseBigInt(powExp), m = parseBigInt(powMod);
            if (!b || e === null || !m) return;
            setPowResult(modPow(b, e, m).toString());
          }}
        >
          Calculate
        </Button>
        {powResult && <ResultBox label="Result" value={powResult} />}
      </CalcCard>

      {/* GCD / Extended GCD */}
      <CalcCard title="GCD / Extended GCD" description="Greatest common divisor and Bézout coefficients: ax + by = gcd(a,b)">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">a</Label>
            <Input value={gcdA} onChange={e => setGcdA(e.target.value)} className="font-mono" placeholder="240" />
          </div>
          <div>
            <Label className="text-xs">b</Label>
            <Input value={gcdB} onChange={e => setGcdB(e.target.value)} className="font-mono" placeholder="46" />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const a = parseBigInt(gcdA), b = parseBigInt(gcdB);
            if (!a || !b) return;
            const g = gcd(a, b);
            const l = lcm(a, b);
            const ext = extendedGcd(a, b);
            setGcdResult(`gcd = ${g}, lcm = ${l}\n${a}×(${ext.x}) + ${b}×(${ext.y}) = ${ext.gcd}`);
          }}
        >
          Calculate
        </Button>
        {gcdResult && (
          <div className="rounded-md border bg-muted/50 p-2.5">
            {gcdResult.split('\n').map((line, i) => (
              <p key={i} className="font-mono text-sm">{line}</p>
            ))}
          </div>
        )}
      </CalcCard>

      {/* Euler Totient */}
      <CalcCard title="Euler's Totient φ(n)" description="Count of integers 1..n coprime to n">
        <div>
          <Label className="text-xs">n</Label>
          <Input value={totN} onChange={e => setTotN(e.target.value)} className="font-mono" placeholder="60" />
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const n = parseBigInt(totN);
            if (!n) return;
            setTotResult(eulerTotient(n).toString());
          }}
        >
          Calculate
        </Button>
        {totResult && <ResultBox label="φ(n)" value={totResult} />}
      </CalcCard>

      {/* Square Root mod p */}
      <CalcCard title="Square Root mod p" description="Find x such that x² ≡ a (mod p), using Tonelli-Shanks">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">a</Label>
            <Input value={sqrtA} onChange={e => setSqrtA(e.target.value)} className="font-mono" placeholder="4" />
          </div>
          <div>
            <Label className="text-xs">p (prime)</Label>
            <Input value={sqrtP} onChange={e => setSqrtP(e.target.value)} className="font-mono" placeholder="7" />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            setSqrtError('');
            const a = parseBigInt(sqrtA), p = parseBigInt(sqrtP);
            if (!a || !p) return;
            if (!isPrime(p)) { setSqrtError('p must be prime'); return; }
            const r = sqrtModP(a, p);
            if (r === null) { setSqrtResult('No square root (a is not a quadratic residue mod p)'); }
            else {
              const r2 = mod(-r, p);
              setSqrtResult(`x = ${r} or x = ${r2}`);
            }
          }}
        >
          Calculate
        </Button>
        {sqrtError && <p className="text-xs text-destructive">{sqrtError}</p>}
        {sqrtResult && <ResultBox label="√a mod p" value={sqrtResult} />}
      </CalcCard>

      {/* Legendre Symbol */}
      <CalcCard title="Legendre Symbol (a/p)" description="Determine if a is a quadratic residue mod p">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">a</Label>
            <Input value={legA} onChange={e => setLegA(e.target.value)} className="font-mono" placeholder="2" />
          </div>
          <div>
            <Label className="text-xs">p (odd prime)</Label>
            <Input value={legP} onChange={e => setLegP(e.target.value)} className="font-mono" placeholder="7" />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const a = parseBigInt(legA), p = parseBigInt(legP);
            if (!a || !p) return;
            const r = legendreSymbol(a, p);
            const meaning = r === 1 ? 'Quadratic residue' : r === -1 ? 'Non-residue' : 'Zero (a ≡ 0 mod p)';
            setLegResult(`(${a}/${p}) = ${r}  — ${meaning}`);
          }}
        >
          Calculate
        </Button>
        {legResult && <ResultBox label="Result" value={legResult} />}
      </CalcCard>

      {/* Primality Test */}
      <CalcCard title="Primality Test" description="Miller-Rabin primality test (deterministic for n < 3.3×10²⁴)">
        <div>
          <Label className="text-xs">n</Label>
          <Input value={primeN} onChange={e => setPrimeN(e.target.value)} className="font-mono" placeholder="104729" />
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const n = parseBigInt(primeN);
            if (!n) return;
            const result = isPrime(n);
            setPrimeResult(result ? `${n} is PRIME` : `${n} is COMPOSITE`);
          }}
        >
          Test
        </Button>
        {primeResult && (
          <div className="flex items-center gap-2">
            <Badge variant={primeResult.includes('PRIME') && !primeResult.includes('COMPOSITE') ? 'default' : 'destructive'}>
              {primeResult.includes('PRIME') && !primeResult.includes('COMPOSITE') ? 'Prime' : 'Composite'}
            </Badge>
            <span className="font-mono text-sm">{primeResult}</span>
          </div>
        )}
      </CalcCard>
    </div>
  );
}
