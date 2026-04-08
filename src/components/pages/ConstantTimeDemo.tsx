import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, FormulaBox, ComputationRow } from '@/components/StepCard';

export function ConstantTimeDemo() {
  const [secret, setSecret] = useState('correctpassword');
  const [guess, setGuess] = useState('correctpasswXXX');
  const [results, setResults] = useState<{ method: string; time: number; match: boolean }[]>([]);
  const [prefixTimings, setPrefixTimings] = useState<{ prefix: number; time: number }[]>([]);
  const [trials] = useState(1000);

  function earlyExitCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false; // EARLY EXIT — leaks position of first difference
    }
    return true;
  }

  function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i); // NO branch on difference
    }
    return diff === 0;
  }

  function doMeasure() {
    const n = Math.min(trials, 10000);
    const measurements: typeof results = [];

    // Warm up JIT
    for (let i = 0; i < 100; i++) { earlyExitCompare(secret, guess); constantTimeCompare(secret, guess); }

    // Early exit comparison
    const t0 = performance.now();
    let earlyResult = false;
    for (let i = 0; i < n; i++) earlyResult = earlyExitCompare(secret, guess);
    const earlyTime = (performance.now() - t0) / n;

    // Constant-time comparison
    const t1 = performance.now();
    let ctResult = false;
    for (let i = 0; i < n; i++) ctResult = constantTimeCompare(secret, guess);
    const ctTime = (performance.now() - t1) / n;

    measurements.push({ method: 'Early-exit (===)', time: earlyTime * 1000, match: earlyResult });
    measurements.push({ method: 'Constant-time (XOR)', time: ctTime * 1000, match: ctResult });

    // Also measure with different prefix lengths to show timing leak
    const prefixTests = [0, 4, 8, 12, secret.length].map(prefixLen => {
      const testGuess = secret.substring(0, prefixLen) + 'X'.repeat(Math.max(0, secret.length - prefixLen));
      const t = performance.now();
      for (let i = 0; i < n; i++) earlyExitCompare(secret, testGuess);
      const time = (performance.now() - t) / n;
      return { prefix: prefixLen, time: time * 1000 };
    });

    setResults(measurements);
    setPrefixTimings(prefixTests);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Constant-Time Comparison Demo</CardTitle>
          <CardDescription>
            String comparison with === exits at the first difference — timing reveals HOW MUCH
            of the string matched. XOR-based comparison always processes all bytes.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup" status={results.length > 0 ? 'complete' : 'active'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Secret (server-side)</Label><Input value={secret} onChange={e => setSecret(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Guess (attacker tries)</Label><Input value={guess} onChange={e => setGuess(e.target.value)} className="font-mono" /></div>
        </div>
        <p className="text-xs text-muted-foreground">
          Matching prefix: {(() => {
            let i = 0;
            while (i < Math.min(secret.length, guess.length) && secret[i] === guess[i]) i++;
            return i;
          })()} / {secret.length} characters
        </p>
        <Button onClick={doMeasure} className="w-full">Measure Timing ({trials} trials each)</Button>
      </StepCard>

      {results.length > 0 && (
        <>
          <StepCard step={2} title="Timing Results" status="active">
            <FormulaBox>
              {results.map((r, i) => (
                <ComputationRow key={i} label={r.method} value={`${r.time.toFixed(3)} μs/call | ${r.match ? 'match' : 'no match'}`} highlight={i === 0} />
              ))}
            </FormulaBox>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs font-medium">Early-exit timing by prefix length:</p>
                <p className="text-xs text-muted-foreground">Longer matching prefix = more time = attacker learns correct prefix character-by-character.</p>
                {prefixTimings.length > 0 && (
                  <div className="space-y-1">
                    {prefixTimings.map((pt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono w-24 shrink-0">Prefix {pt.prefix}/{secret.length}</span>
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-red-500/60 rounded"
                            style={{ width: `${Math.max(5, (pt.time / Math.max(...prefixTimings.map(p => p.time))) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">{pt.time.toFixed(3)} μs</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Matters</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                An attacker guessing a password/MAC byte-by-byte measures how long each comparison takes.
                Early-exit: "correct" prefix takes longer → reveals position of first wrong byte.
                With n attempts per position, an n-byte secret is cracked in O(n × 256) instead of O(256^n).
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Use XOR-based comparison (constant-time): accumulate differences
                with bitwise OR, check final result. No branch depends on secret data.
                In Node.js: <code className="text-[10px]">crypto.timingSafeEqual()</code>.
                In Web Crypto: <code className="text-[10px]">crypto.subtle.verify()</code> for MACs.
              </p>
            </div>
          </StepCard>

          <StepCard step={3} title="Code Comparison" status="active">
            <FormulaBox>
              <p className="text-xs text-red-500 font-semibold mb-1">VULNERABLE (early exit):</p>
              <pre className="text-[10px] font-mono whitespace-pre-wrap">{'for (i = 0; i < a.length; i++)\n  if (a[i] !== b[i]) return false; // LEAKS i'}</pre>
            </FormulaBox>
            <FormulaBox>
              <p className="text-xs text-green-500 font-semibold mb-1">SAFE (constant-time):</p>
              <pre className="text-[10px] font-mono whitespace-pre-wrap">{'let diff = 0;\nfor (i = 0; i < a.length; i++)\n  diff |= a[i] ^ b[i]; // NO early exit\nreturn diff === 0;'}</pre>
            </FormulaBox>
          </StepCard>
        </>
      )}
    </div>
  );
}
