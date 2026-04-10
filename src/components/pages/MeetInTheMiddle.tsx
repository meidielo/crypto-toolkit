import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormulaBox, ComputationRow } from '@/components/StepCard';
import { sdesEncrypt, sdesDecrypt, meetInTheMiddle, type SDESStep, type MITMResult } from '@/lib/sdes';

function toBin(n: number, w: number): string { return n.toString(2).padStart(w, '0'); }

function StepTrace({ steps }: { steps: SDESStep[] }) {
  return (
    <div className="overflow-auto max-h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b">
            <th className="text-left py-1 px-2">Phase</th>
            <th className="text-left py-1 px-2">Input</th>
            <th className="text-left py-1 px-2">Output</th>
            <th className="text-left py-1 px-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i} className="border-b">
              <td className="py-1 px-2 font-semibold whitespace-nowrap">{s.phase}</td>
              <td className="py-1 px-2 font-mono">{s.input}</td>
              <td className="py-1 px-2 font-mono">{s.output}</td>
              <td className="py-1 px-2 font-mono text-muted-foreground">{s.detail ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MeetInTheMiddle() {
  // S-DES Explorer
  const [expPt, setExpPt] = useState('170');  // 10101010 = 170
  const [expKey, setExpKey] = useState('642'); // 1010000010 = 642
  const [expMode, setExpMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [expResult, setExpResult] = useState<{ value: number; steps: SDESStep[] } | null>(null);

  // 2DES Demo
  const [demoPt, setDemoPt] = useState('170');
  const [demoK1, setDemoK1] = useState('642');
  const [demoK2, setDemoK2] = useState('381');
  const [demoResult, setDemoResult] = useState<{ mid: number; ct: number } | null>(null);

  // MITM Attack
  const [atkPt, setAtkPt] = useState('');
  const [atkCt, setAtkCt] = useState('');
  const [atkResult, setAtkResult] = useState<MITMResult | null>(null);
  const [atkRunning, setAtkRunning] = useState(false);

  function doExplorer() {
    const pt = parseInt(expPt);
    const key = parseInt(expKey);
    if (isNaN(pt) || pt < 0 || pt > 255) return;
    if (isNaN(key) || key < 0 || key > 1023) return;
    if (expMode === 'encrypt') {
      const r = sdesEncrypt(pt, key);
      setExpResult({ value: r.ciphertext, steps: r.steps });
    } else {
      const r = sdesDecrypt(pt, key);
      setExpResult({ value: r.plaintext, steps: r.steps });
    }
  }

  function doDemo() {
    const pt = parseInt(demoPt);
    const k1 = parseInt(demoK1);
    const k2 = parseInt(demoK2);
    if ([pt, k1, k2].some(isNaN) || pt < 0 || pt > 255 || k1 < 0 || k1 > 1023 || k2 < 0 || k2 > 1023) return;
    const mid = sdesEncrypt(pt, k1).ciphertext;
    const ct = sdesEncrypt(mid, k2).ciphertext;
    setDemoResult({ mid, ct });
    // Pre-fill attack inputs
    setAtkPt(pt.toString());
    setAtkCt(ct.toString());
  }

  function doAttack() {
    const pt = parseInt(atkPt);
    const ct = parseInt(atkCt);
    if (isNaN(pt) || pt < 0 || pt > 255 || isNaN(ct) || ct < 0 || ct > 255) return;
    setAtkRunning(true);
    // Run async to let UI update
    setTimeout(() => {
      setAtkResult(meetInTheMiddle(pt, ct));
      setAtkRunning(false);
    }, 20);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Meet-in-the-Middle Attack on 2DES</CardTitle>
          <CardDescription>
            Demonstrates why double encryption doesn't double security. Uses Simplified DES
            (8-bit block, 10-bit key) so the attack completes instantly — the same principle
            applies to full DES where MITM reduces 2DES from 2¹¹² to 2⁵⁷ operations.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="explorer" className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="explorer">S-DES Explorer</TabsTrigger>
          <TabsTrigger value="demo">2DES Demo</TabsTrigger>
          <TabsTrigger value="attack">MITM Attack</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">S-DES Encrypt / Decrypt</CardTitle>
              <CardDescription>Simplified DES: 8-bit block, 10-bit key, 2 Feistel rounds with S-boxes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{expMode === 'encrypt' ? 'Plaintext' : 'Ciphertext'} (0-255)</Label>
                  <Input value={expPt} onChange={e => setExpPt(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Key (0-1023)</Label>
                  <Input value={expKey} onChange={e => setExpKey(e.target.value)} className="font-mono" />
                </div>
                <div className="flex items-end gap-1.5">
                  <Badge
                    variant={expMode === 'encrypt' ? 'default' : 'outline'}
                    className="cursor-pointer h-9 px-3"
                    onClick={() => { setExpMode('encrypt'); setExpResult(null); }}
                  >Encrypt</Badge>
                  <Badge
                    variant={expMode === 'decrypt' ? 'default' : 'outline'}
                    className="cursor-pointer h-9 px-3"
                    onClick={() => { setExpMode('decrypt'); setExpResult(null); }}
                  >Decrypt</Badge>
                </div>
              </div>
              {!isNaN(parseInt(expPt)) && (
                <p className="text-xs text-muted-foreground font-mono">
                  Binary: {toBin(parseInt(expPt) & 0xFF, 8)} | Key: {toBin(parseInt(expKey) & 0x3FF, 10)}
                </p>
              )}
              <Button onClick={doExplorer} className="w-full">{expMode === 'encrypt' ? 'Encrypt' : 'Decrypt'}</Button>
              {expResult && (
                <div className="space-y-3">
                  <FormulaBox>
                    <ComputationRow label="Input" value={`${expPt} (${toBin(parseInt(expPt) & 0xFF, 8)})`} />
                    <ComputationRow label="Key" value={`${expKey} (${toBin(parseInt(expKey) & 0x3FF, 10)})`} />
                    <ComputationRow label="Output" value={`${expResult.value} (${toBin(expResult.value, 8)})`} highlight />
                  </FormulaBox>
                  <StepTrace steps={expResult.steps} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Double S-DES Encryption</CardTitle>
              <CardDescription>C = Enc(K2, Enc(K1, P)) — two independent keys, two passes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label className="text-xs">Plaintext (0-255)</Label><Input value={demoPt} onChange={e => setDemoPt(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">K1 (0-1023)</Label><Input value={demoK1} onChange={e => setDemoK1(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">K2 (0-1023)</Label><Input value={demoK2} onChange={e => setDemoK2(e.target.value)} className="font-mono" /></div>
              </div>
              <Button onClick={doDemo} className="w-full">Double Encrypt</Button>
              {demoResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-mono justify-center flex-wrap">
                    <Badge variant="outline">P={demoPt}</Badge>
                    <span>→ Enc(K1) →</span>
                    <Badge variant="secondary">{demoResult.mid}</Badge>
                    <span>→ Enc(K2) →</span>
                    <Badge variant="default">C={demoResult.ct}</Badge>
                  </div>
                  <FormulaBox>
                    <ComputationRow label="Plaintext P" value={`${demoPt} (${toBin(parseInt(demoPt) & 0xFF, 8)})`} />
                    <ComputationRow label="Intermediate" value={`${demoResult.mid} (${toBin(demoResult.mid, 8)})`} />
                    <ComputationRow label="Ciphertext C" value={`${demoResult.ct} (${toBin(demoResult.ct, 8)})`} highlight />
                    <ComputationRow label="Key space" value={`2^20 = ${(1 << 20).toLocaleString()} possible (K1, K2) pairs`} />
                  </FormulaBox>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attack">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meet-in-the-Middle Attack</CardTitle>
              <CardDescription>Given known (P, C), recover K1 and K2 in O(2^k) instead of O(2^2k)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Known plaintext (0-255)</Label><Input value={atkPt} onChange={e => setAtkPt(e.target.value)} className="font-mono" /></div>
                <div><Label className="text-xs">Known ciphertext (0-255)</Label><Input value={atkCt} onChange={e => setAtkCt(e.target.value)} className="font-mono" /></div>
              </div>
              <Button onClick={doAttack} disabled={atkRunning} className="w-full">
                {atkRunning ? 'Running MITM...' : 'Run Meet-in-the-Middle Attack'}
              </Button>

              {atkResult && (
                <div className="space-y-4">
                  <FormulaBox>
                    <ComputationRow label="Matches found" value={atkResult.matches.length.toString()} highlight />
                    <ComputationRow label="Encryptions (phase 1)" value={atkResult.encryptTableSize.toLocaleString()} />
                    <ComputationRow label="Decryptions (phase 2)" value={atkResult.decryptChecks.toLocaleString()} />
                    <ComputationRow label="Total MITM ops" value={atkResult.mitmSpace.toLocaleString()} />
                    <ComputationRow label="Brute force would need" value={atkResult.bruteForceSpace.toLocaleString()} />
                    <ComputationRow label="Speedup" value={`${Math.round(atkResult.bruteForceSpace / atkResult.mitmSpace)}×`} />
                  </FormulaBox>

                  {atkResult.matches.length > 0 && (
                    <div className="overflow-auto max-h-48">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b">
                            <th className="text-left py-1.5 px-2">#</th>
                            <th className="text-left py-1.5 px-2">K1</th>
                            <th className="text-left py-1.5 px-2">K2</th>
                            <th className="text-left py-1.5 px-2">Intermediate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atkResult.matches.slice(0, 20).map((m, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-1 px-2 font-mono">{m.k1} ({toBin(m.k1, 10)})</td>
                              <td className="py-1 px-2 font-mono">{m.k2} ({toBin(m.k2, 10)})</td>
                              <td className="py-1 px-2 font-mono">{m.intermediate} ({toBin(m.intermediate, 8)})</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {atkResult.matches.length > 20 && (
                        <p className="text-xs text-muted-foreground py-2 px-2">
                          ...and {atkResult.matches.length - 20} more matches
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs space-y-2">
                    <p><strong>Why this breaks 2DES:</strong> An attacker with one known plaintext-ciphertext pair needs
                      only 2×2^k operations (where k = key length) instead of 2^2k. For full DES (k=56), that's
                      2^57 instead of 2^112 — a factor of 2^55 speedup.</p>
                    <p>This is why Triple-DES (3DES) was standardized instead: MITM on 3DES still requires 2^112
                      operations. AES replaced 3DES entirely because 128-bit keys are immune to MITM.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
