import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';

type Preset = 'weak' | 'owasp' | 'strong';

const PRESETS: Record<Preset, { label: string; memory: number; iterations: number; parallelism: number }> = {
  weak: { label: 'Weak (64 KB, 1 iter)', memory: 64, iterations: 1, parallelism: 1 },
  owasp: { label: 'OWASP Minimum (19 MB, 2 iter)', memory: 19456, iterations: 2, parallelism: 1 },
  strong: { label: 'Strong (64 MB, 3 iter)', memory: 65536, iterations: 3, parallelism: 4 },
};

export function Argon2Workflow() {
  const [password, setPassword] = useState('mypassword123');
  const [salt, setSalt] = useState('somesalt');
  const [preset, setPreset] = useState<Preset>('weak');
  const [memoryKB, setMemoryKB] = useState('64');
  const [iterations, setIterations] = useState('1');
  const [parallelism, setParallelism] = useState('1');
  const [hashLength, setHashLength] = useState('32');

  const [computing, setComputing] = useState(false);
  const [argonResult, setArgonResult] = useState<{ hash: string; timeMs: number } | null>(null);
  const [shaResult, setShaResult] = useState<{ hash: string; timeMs: number } | null>(null);
  const [error, setError] = useState('');

  function loadPreset(p: Preset) {
    setPreset(p);
    const cfg = PRESETS[p];
    setMemoryKB(cfg.memory.toString());
    setIterations(cfg.iterations.toString());
    setParallelism(cfg.parallelism.toString());
  }

  async function doCompute() {
    setError('');
    setComputing(true);
    setArgonResult(null);
    setShaResult(null);

    try {
      // Dynamic import to avoid loading WASM until needed
      const { argon2id } = await import('hash-wasm');

      // Argon2id
      const mem = parseInt(memoryKB);
      const iter = parseInt(iterations);
      const par = parseInt(parallelism);
      const hLen = parseInt(hashLength);

      if (mem < 8 || mem > 262144) { setError('Memory must be 8-262144 KB'); setComputing(false); return; }
      if (iter < 1 || iter > 10) { setError('Iterations must be 1-10'); setComputing(false); return; }

      const t0 = performance.now();
      const argonHash = await argon2id({
        password,
        salt,
        parallelism: par,
        iterations: iter,
        memorySize: mem,
        hashLength: hLen,
        outputType: 'hex',
      });
      const argonTime = performance.now() - t0;
      setArgonResult({ hash: argonHash, timeMs: Math.round(argonTime) });

      // SHA-256 for comparison
      const t1 = performance.now();
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const sha256Buf = await crypto.subtle.digest('SHA-256', data);
      const shaTime = performance.now() - t1;
      const shaHash = Array.from(new Uint8Array(sha256Buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      setShaResult({ hash: shaHash, timeMs: Math.round(shaTime * 1000) / 1000 });
    } catch (e) {
      setError(String(e));
    }
    setComputing(false);
  }

  const speedRatio = argonResult && shaResult && shaResult.timeMs > 0
    ? Math.round(argonResult.timeMs / Math.max(shaResult.timeMs, 0.001))
    : null;

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Argon2id — Memory-Hard Key Derivation</CardTitle>
          <CardDescription>
            Winner of the Password Hashing Competition (2015). OWASP-recommended for credential storage.
            Memory-hard: each hash attempt requires allocating megabytes of RAM, making GPU brute-forcing infeasible.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Parameters */}
      <StepCard step={1} title="Parameters" status="active">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(Object.entries(PRESETS) as [Preset, typeof PRESETS[Preset]][]).map(([key, cfg]) => (
            <Badge
              key={key}
              variant={preset === key ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => loadPreset(key)}
            >
              {cfg.label}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Password</Label><Input value={password} onChange={e => setPassword(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Salt</Label><Input value={salt} onChange={e => setSalt(e.target.value)} className="font-mono" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">Memory (KB)</Label><Input value={memoryKB} onChange={e => setMemoryKB(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Iterations</Label><Input value={iterations} onChange={e => setIterations(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Parallelism</Label><Input value={parallelism} onChange={e => setParallelism(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Hash Length</Label><Input value={hashLength} onChange={e => setHashLength(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doCompute} disabled={computing} className="w-full">
          {computing ? 'Computing (WASM)...' : 'Hash with Argon2id + SHA-256'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {/* Results */}
      {argonResult && shaResult && (
        <>
          <StepCard step={2} title="Argon2id Result" status="complete">
            <FormulaBox>
              <ComputationRow label="Hash (hex)" value={argonResult.hash} highlight />
              <ComputationRow label="Time" value={`${argonResult.timeMs} ms`} />
              <ComputationRow label="Memory used" value={`${memoryKB} KB (${(parseInt(memoryKB) / 1024).toFixed(1)} MB)`} />
              <ComputationRow label="Engine" value="hash-wasm (Argon2id compiled to WebAssembly)" />
            </FormulaBox>
          </StepCard>

          <StepCard step={3} title="SHA-256 Comparison" status="complete">
            <FormulaBox>
              <ComputationRow label="SHA-256 hash" value={shaResult.hash} />
              <ComputationRow label="Time" value={`${shaResult.timeMs} ms`} />
            </FormulaBox>

            {/* Timing comparison bar chart */}
            <div className="space-y-2 mt-3">
              <p className="text-xs font-medium">Timing Comparison:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono w-20 shrink-0">Argon2id</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-red-500/60 rounded flex items-center px-2" style={{ width: '100%' }}>
                      <span className="text-[10px] font-bold text-white">{argonResult.timeMs} ms</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono w-20 shrink-0">SHA-256</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500/60 rounded flex items-center px-2"
                      style={{ width: `${Math.max(1, (shaResult.timeMs / argonResult.timeMs) * 100)}%`, minWidth: '60px' }}
                    >
                      <span className="text-[10px] font-bold text-white">{shaResult.timeMs} ms</span>
                    </div>
                  </div>
                </div>
              </div>
              {speedRatio && (
                <p className="text-xs text-muted-foreground">
                  Argon2id is <strong className="text-red-500">{speedRatio}x slower</strong> than SHA-256.
                  An attacker with GPUs can try billions of SHA-256 hashes/second but only thousands of
                  Argon2id hashes/second because each attempt requires allocating {memoryKB} KB of RAM.
                </p>
              )}
            </div>
          </StepCard>

          <StepCard step={4} title="Why Memory-Hardness Matters" status="complete">
            <Card>
              <CardContent className="pt-4 space-y-3">
                {/* Memory architecture diagram */}
                <p className="text-xs font-medium">Memory Lane Architecture:</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {Array.from({ length: 32 }, (_, i) => {
                    const lane = Math.floor(i / 8);
                    const slice = i % 8;
                    const colors = ['bg-blue-500/30', 'bg-green-500/30', 'bg-purple-500/30', 'bg-orange-500/30'];
                    return (
                      <div
                        key={i}
                        className={`h-6 rounded text-[8px] flex items-center justify-center font-mono ${colors[lane]} border border-border`}
                      >
                        L{lane}S{slice}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>L0-L3 = Memory Lanes</span>
                  <span>S0-S7 = Slices (sequential within lane)</span>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1.5">
                  <p><strong>Sequential dependency:</strong> Each block in a lane depends on the previous block. Cannot skip ahead.</p>
                  <p><strong>Cross-lane mixing:</strong> Blocks reference blocks from other lanes, preventing lane-parallel attacks.</p>
                  <p><strong>Memory-hardness:</strong> ALL blocks must be kept in memory simultaneously. A GPU with 16KB per-core cache cannot run this — it needs the full {memoryKB} KB per thread.</p>
                  <p><strong>Argon2id:</strong> Combines Argon2i (data-independent, side-channel resistant) for first pass with Argon2d (data-dependent, GPU resistant) for subsequent passes.</p>
                </div>
              </CardContent>
            </Card>
          </StepCard>
        </>
      )}
    </div>
  );
}
