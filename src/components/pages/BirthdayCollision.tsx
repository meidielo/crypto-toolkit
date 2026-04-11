import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { SHA256 } from '@/lib/sha256';
import { randBytes } from '@/lib/num-util';

export function BirthdayCollision() {
  const [truncBits, setTruncBits] = useState('24');
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<{
    msg1: string; msg2: string; hash: string;
    attempts: number; expectedAttempts: number;
  } | null>(null);
  const [error, setError] = useState('');

  function doFind() {
    setError('');
    setResult(null);
    const bits = parseInt(truncBits);
    if (bits < 8 || bits > 32) { setError('Truncation must be 8-32 bits'); return; }

    setComputing(true);

    // Chunked async iteration: process CHUNK_SIZE hashes per frame to keep the
    // UI responsive. At 24 bits we need up to 2^24 = 16M iterations — running
    // synchronously would freeze the browser for seconds.
    const mask = (1 << bits) - 1;
    const seen = new Map<number, string>();
    const maxAttempts = 1 << Math.min(bits, 24);
    const CHUNK_SIZE = 10_000;
    const seed = Array.from(randBytes(4)).map(b => b.toString(16).padStart(2, '0')).join('');
    let offset = 0;

    function processChunk() {
      const end = Math.min(offset + CHUNK_SIZE, maxAttempts);
      for (let i = offset; i < end; i++) {
        const msg = `msg_${seed}_${i}`;
        const fullHash = SHA256.hash(msg);
        const truncated = parseInt(fullHash.substring(0, Math.ceil(bits / 4)), 16) & mask;

        const existing = seen.get(truncated);
        if (existing && existing !== msg) {
          const expectedAttempts = Math.round(Math.sqrt(Math.PI / 2 * (1 << bits)));
          setResult({
            msg1: existing,
            msg2: msg,
            hash: truncated.toString(16).padStart(Math.ceil(bits / 4), '0'),
            attempts: i + 1,
            expectedAttempts,
          });
          setComputing(false);
          return;
        }
        seen.set(truncated, msg);
      }
      offset = end;
      if (offset >= maxAttempts) {
        setError(`No collision found in ${maxAttempts.toLocaleString()} attempts. Try fewer bits.`);
        setComputing(false);
      } else {
        // Yield to browser, then process next chunk
        setTimeout(processChunk, 0);
      }
    }
    setTimeout(processChunk, 0);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Birthday Collision Finder</CardTitle>
          <CardDescription>
            Find two messages with the same truncated SHA-256 hash. By the birthday paradox,
            a collision in n-bit output requires only ~√(2^n) ≈ 2^(n/2) attempts.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Configure & Search" status={result ? 'complete' : 'active'}>
        <div>
          <Label className="text-xs">Truncation (bits) — smaller = faster collision</Label>
          <Input value={truncBits} onChange={e => setTruncBits(e.target.value)} className="font-mono w-24" />
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Output space: 2^{truncBits} = {(1 << Math.min(parseInt(truncBits) || 0, 30)).toLocaleString()} values</p>
          <p>Expected collisions after: ~2^{Math.ceil((parseInt(truncBits) || 0) / 2)} = ~{Math.round(Math.sqrt(Math.PI / 2 * (1 << Math.min(parseInt(truncBits) || 0, 30)))).toLocaleString()} hashes</p>
        </div>
        <Button onClick={doFind} disabled={computing} className="w-full">
          {computing ? 'Searching for collision...' : 'Find Birthday Collision'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {result && (
        <StepCard step={2} title="Collision Found" status="active">
          <FormulaBox>
            <ComputationRow label="Message 1" value={result.msg1} />
            <ComputationRow label="Message 2" value={result.msg2} />
            <ComputationRow label={`Truncated hash (${truncBits}-bit)`} value={`0x${result.hash}`} highlight />
            <ComputationRow label="Attempts" value={result.attempts.toLocaleString()} />
            <ComputationRow label="Expected (√πN/2)" value={result.expectedAttempts.toLocaleString()} />
            <div className="mt-2 pt-2 border-t flex items-center gap-2">
              <Badge variant="destructive">COLLISION</Badge>
              <span className="text-xs text-muted-foreground">
                Two different messages, same {truncBits}-bit hash
              </span>
            </div>
          </FormulaBox>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2">Hash bits</th>
                  <th className="text-left py-1 px-2">Output space</th>
                  <th className="text-left py-1 px-2">Expected attempts</th>
                  <th className="text-left py-1 px-2">Time @ 10^9/sec</th>
                </tr>
              </thead>
              <tbody>
                {[16, 24, 32, 64, 128, 256].map(b => {
                  const space = `2^${b}`;
                  const attempts = `2^${Math.ceil(b / 2)}`;
                  let time: string;
                  const logTime = b / 2 - 30; // log10(2^(b/2)) - log10(10^9)
                  if (logTime < 0) time = '< 1 second';
                  else if (logTime < 3) time = `~${Math.pow(10, logTime).toFixed(0)} seconds`;
                  else time = `~10^${logTime.toFixed(0)} seconds`;
                  return (
                    <tr key={b} className={`border-b ${b === parseInt(truncBits) ? 'bg-primary/10' : ''}`}>
                      <td className="py-1 px-2">{b}</td>
                      <td className="py-1 px-2">{space}</td>
                      <td className="py-1 px-2">{attempts}</td>
                      <td className="py-1 px-2">{time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            SHA-256 (256-bit) requires ~2^128 attempts for a collision. At 10^9 hashes/sec,
            that's ~10^8 years. This is why 256-bit hashes are considered collision-resistant.
          </p>
        </StepCard>
      )}
    </div>
  );
}
