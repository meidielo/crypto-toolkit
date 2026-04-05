import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { factorize, factorizeToString, isPrime, nextPrime, eulerTotient } from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try {
    const t = s.trim();
    if (!t) return null;
    return BigInt(t);
  } catch {
    return null;
  }
}

export function Factorization() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    n: bigint;
    factors: Map<bigint, number>;
    factorString: string;
    prime: boolean;
    totient: bigint;
    divisorCount: number;
    nextP: bigint;
  } | null>(null);
  const [error, setError] = useState('');
  const [computing, setComputing] = useState(false);

  // Primes list
  const [primeLimit, setPrimeLimit] = useState('1000');
  const [primesList, setPrimesList] = useState<bigint[]>([]);

  function doFactorize() {
    setError('');
    setResult(null);
    const n = parseBigInt(input);
    if (!n || n < 2n) {
      setError('Enter an integer >= 2');
      return;
    }
    if (n > 10n ** 18n) {
      setError('Number too large (max 10^18 for trial division)');
      return;
    }
    setComputing(true);
    setTimeout(() => {
      try {
        const factors = factorize(n);
        const factorString = factorizeToString(n);
        const prime = isPrime(n);
        const totient = eulerTotient(n);
        const nextP = nextPrime(n);

        // Divisor count from prime factorization
        let divisorCount = 1;
        for (const [, exp] of factors) {
          divisorCount *= (exp + 1);
        }

        setResult({ n, factors, factorString, prime, totient, divisorCount, nextP });
      } catch (e) {
        setError(String(e));
      }
      setComputing(false);
    }, 10);
  }

  function listPrimes() {
    const limit = parseInt(primeLimit);
    if (!limit || limit < 2 || limit > 100000) return;
    const primes: bigint[] = [];
    for (let i = 2n; i <= BigInt(limit); i++) {
      if (isPrime(i)) primes.push(i);
    }
    setPrimesList(primes);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integer Factorization</CardTitle>
          <CardDescription>
            Factor an integer into prime components using trial division. Also computes Euler's totient, divisor count, and next prime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Integer to factorize</Label>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="font-mono text-lg"
              placeholder="1234567890"
            />
          </div>
          <Button onClick={doFactorize} disabled={computing} className="w-full">
            {computing ? 'Computing...' : 'Factorize'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-lg">{result.n.toString()}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-mono text-lg font-semibold">{result.factorString}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Primality</p>
                    <Badge variant={result.prime ? 'default' : 'outline'} className="mt-1">
                      {result.prime ? 'Prime' : 'Composite'}
                    </Badge>
                  </div>
                  <div className="rounded-md border p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">φ(n)</p>
                    <p className="font-mono text-sm font-semibold">{result.totient.toString()}</p>
                  </div>
                  <div className="rounded-md border p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Divisors</p>
                    <p className="font-mono text-sm font-semibold">{result.divisorCount}</p>
                  </div>
                  <div className="rounded-md border p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Next Prime</p>
                    <p className="font-mono text-sm font-semibold">{result.nextP.toString()}</p>
                  </div>
                </div>

                {result.factors.size > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Prime Factors:</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(result.factors.entries()).map(([p, e]) => (
                        <Badge key={p.toString()} variant="outline" className="font-mono">
                          {p.toString()}{e > 1 ? <sup>{e}</sup> : null}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prime Number List</CardTitle>
          <CardDescription>List all primes up to a given limit (max 100,000)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Upper limit</Label>
              <Input value={primeLimit} onChange={e => setPrimeLimit(e.target.value)} className="font-mono" placeholder="1000" />
            </div>
            <Button onClick={listPrimes} className="self-end">List Primes</Button>
          </div>
          {primesList.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Found {primesList.length} primes up to {primeLimit}
              </p>
              <div className="max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {primesList.map((p, i) => (
                    <span key={i} className="font-mono text-xs px-1.5 py-0.5 rounded bg-background border">
                      {p.toString()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
