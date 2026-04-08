import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { modPow, isPrime } from '@/lib/crypto-math';


type Phase = 'setup' | 'alice' | 'bob' | 'shared';

export function DHWorkflow() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [pStr, setPStr] = useState('23');
  const [gStr, setGStr] = useState('5');
  const [aStr, setAStr] = useState('6');
  const [bStr, setBStr] = useState('15');

  const [setupError, setSetupError] = useState('');
  const [alicePub, setAlicePub] = useState<bigint | null>(null);
  const [bobPub, setBobPub] = useState<bigint | null>(null);
  const [aliceSecret, setAliceSecret] = useState<bigint | null>(null);
  const [bobSecret, setBobSecret] = useState<bigint | null>(null);

  function doSetup() {
    setSetupError('');
    const p = parseBigInt(pStr), g = parseBigInt(gStr);
    if (!p || !g) { setSetupError('Enter p and g'); return; }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    setPhase('alice');
  }

  function doAlice() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!, a = parseBigInt(aStr);
    if (!a) return;
    setAlicePub(modPow(g, a, p));
    setPhase('bob');
  }

  function doBob() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!, b = parseBigInt(bStr);
    if (!b) return;
    setBobPub(modPow(g, b, p));
    setPhase('shared');
  }

  function doShared() {
    const p = parseBigInt(pStr)!, a = parseBigInt(aStr)!, b = parseBigInt(bStr)!;
    if (!alicePub || !bobPub) return;
    setAliceSecret(modPow(bobPub, a, p));
    setBobSecret(modPow(alicePub, b, p));
  }

  const phaseOrder: Phase[] = ['setup', 'alice', 'bob', 'shared'];
  const phaseIdx = phaseOrder.indexOf(phase);
  function getStatus(p: Phase): 'pending' | 'active' | 'complete' {
    const idx = phaseOrder.indexOf(p);
    if (idx < phaseIdx) return 'complete';
    if (idx === phaseIdx) return 'active';
    return 'pending';
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Diffie-Hellman Key Exchange</CardTitle>
          <CardDescription>
            Two parties agree on a shared secret over an insecure channel without ever transmitting it.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup */}
      <StepCard step={1} title="Public Parameters" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">p (prime modulus)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">g (generator)</Label><Input value={gStr} onChange={e => setGStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Set Public Parameters</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
      </StepCard>

      {/* Alice */}
      <StepCard step={2} title="Alice: Choose Secret & Compute Public Value" status={getStatus('alice')}>
        <div>
          <Label className="text-xs">a (Alice's secret)</Label>
          <Input value={aStr} onChange={e => setAStr(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doAlice} className="w-full">Compute A = g^a mod p</Button>
        {alicePub !== null && (
          <FormulaBox>
            <ComputationRow label="A" formula={`${gStr}^${aStr} mod ${pStr}`} value={alicePub.toString()} highlight />
            <p className="text-xs text-muted-foreground">Alice sends A = {alicePub.toString()} to Bob (public)</p>
          </FormulaBox>
        )}
      </StepCard>

      {/* Bob */}
      <StepCard step={3} title="Bob: Choose Secret & Compute Public Value" status={getStatus('bob')}>
        <div>
          <Label className="text-xs">b (Bob's secret)</Label>
          <Input value={bStr} onChange={e => setBStr(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doBob} className="w-full">Compute B = g^b mod p</Button>
        {bobPub !== null && (
          <FormulaBox>
            <ComputationRow label="B" formula={`${gStr}^${bStr} mod ${pStr}`} value={bobPub.toString()} highlight />
            <p className="text-xs text-muted-foreground">Bob sends B = {bobPub.toString()} to Alice (public)</p>
          </FormulaBox>
        )}
      </StepCard>

      {/* Shared Secret */}
      <StepCard step={4} title="Shared Secret Computation" status={getStatus('shared')}>
        <Button onClick={doShared} className="w-full">Both Compute Shared Secret</Button>
        {aliceSecret !== null && bobSecret !== null && (
          <FormulaBox>
            <p className="text-xs text-muted-foreground mb-2">Alice computes:</p>
            <ComputationRow label="s" formula={`B^a mod p = ${bobPub}^${aStr} mod ${pStr}`} value={aliceSecret.toString()} highlight />
            <p className="text-xs text-muted-foreground mb-2 mt-3">Bob computes:</p>
            <ComputationRow label="s" formula={`A^b mod p = ${alicePub}^${bStr} mod ${pStr}`} value={bobSecret.toString()} highlight />
            <div className="mt-3 pt-3 border-t flex items-center gap-2">
              <Badge variant={aliceSecret === bobSecret ? 'default' : 'destructive'}>
                {aliceSecret === bobSecret ? 'MATCH' : 'MISMATCH'}
              </Badge>
              <span className="text-sm font-mono">
                Shared secret = {aliceSecret.toString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Both computed g^(ab) mod p = {gStr}^({aStr}×{bStr}) mod {pStr} = {aliceSecret.toString()}
            </p>
          </FormulaBox>
        )}
      </StepCard>
    </div>
  );
}
