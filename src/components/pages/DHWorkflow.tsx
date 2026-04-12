import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
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

  const getStatus = usePhaseStatus<Phase>(['setup', 'alice', 'bob', 'shared'], phase);

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

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">
          Alice and Bob want to encrypt their messages, but they need a shared key first. The catch: every message between
          them passes through an insecure channel that Eve can read. How do you agree on a secret when someone is listening
          to everything you say?
        </p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">
          Modular exponentiation is a <em>one-way function</em>: computing g<sup>a</sup> mod p is fast, but recovering a
          from the result (the <em>discrete logarithm problem</em>) is computationally infeasible for large p. Diffie-Hellman
          exploits this asymmetry so that Alice and Bob each contribute half the secret, and Eve — who sees both halves —
          still can't combine them.
        </p>
      </div>

      {/* Setup */}
      <StepCard step={1} title="Public Parameters" status={getStatus('setup')}>
        <p className="text-xs text-muted-foreground">
          Alice and Bob publicly agree on a prime <strong>p</strong> and a generator <strong>g</strong>. These are not secret —
          Eve knows them too. The security comes from what happens next, not from hiding these values. In practice, standardized
          groups (RFC 3526) are used so nobody has to trust the other party's choice of p.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">p (prime modulus)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">g (generator)</Label><Input value={gStr} onChange={e => setGStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Set Public Parameters</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
      </StepCard>

      {/* Alice */}
      <StepCard step={2} title="Alice: Choose Secret & Compute Public Value" status={getStatus('alice')}>
        <p className="text-xs text-muted-foreground">
          Alice picks a random secret <strong>a</strong> and computes A = g<sup>a</sup> mod p. She sends A to Bob publicly.
          Even though Eve sees A, she cannot recover a because that would require solving the discrete logarithm — which is
          the hard problem that makes this protocol secure.
        </p>
        <div>
          <Label className="text-xs">a (Alice's secret — never transmitted)</Label>
          <Input value={aStr} onChange={e => setAStr(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doAlice} className="w-full">Compute A = g^a mod p</Button>
        {alicePub !== null && (
          <FormulaBox>
            <ComputationRow label="A" formula={`${gStr}^${aStr} mod ${pStr}`} value={alicePub.toString()} highlight />
            <p className="text-xs text-muted-foreground">Alice sends A = {alicePub.toString()} to Bob over the public channel</p>
          </FormulaBox>
        )}
      </StepCard>

      {/* Bob */}
      <StepCard step={3} title="Bob: Choose Secret & Compute Public Value" status={getStatus('bob')}>
        <p className="text-xs text-muted-foreground">
          Bob does the same thing independently: picks a random secret <strong>b</strong>, computes B = g<sup>b</sup> mod p,
          and sends B to Alice publicly. At this point Eve has seen p, g, A, and B — but not a or b.
        </p>
        <div>
          <Label className="text-xs">b (Bob's secret — never transmitted)</Label>
          <Input value={bStr} onChange={e => setBStr(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doBob} className="w-full">Compute B = g^b mod p</Button>
        {bobPub !== null && (
          <FormulaBox>
            <ComputationRow label="B" formula={`${gStr}^${bStr} mod ${pStr}`} value={bobPub.toString()} highlight />
            <p className="text-xs text-muted-foreground">Bob sends B = {bobPub.toString()} to Alice over the public channel</p>
          </FormulaBox>
        )}
      </StepCard>

      {/* Shared Secret */}
      <StepCard step={4} title="Shared Secret Computation" status={getStatus('shared')}>
        <p className="text-xs text-muted-foreground">
          Here's the magic: Alice takes Bob's public value B and raises it to her secret a. Bob takes Alice's public value A
          and raises it to his secret b. Both get the same result because B<sup>a</sup> = (g<sup>b</sup>)<sup>a</sup> = g<sup>ab</sup> = (g<sup>a</sup>)<sup>b</sup> = A<sup>b</sup>.
          Eve would need either a or b to compute this — and she has neither.
        </p>
        <Button onClick={doShared} className="w-full">Both Compute Shared Secret</Button>
        {aliceSecret !== null && bobSecret !== null && (
          <FormulaBox>
            <p className="text-xs text-muted-foreground mb-2">Alice computes: B<sup>a</sup> mod p</p>
            <ComputationRow label="s" formula={`B^a mod p = ${bobPub}^${aStr} mod ${pStr}`} value={aliceSecret.toString()} highlight />
            <p className="text-xs text-muted-foreground mb-2 mt-3">Bob computes: A<sup>b</sup> mod p</p>
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
              Both computed g<sup>ab</sup> mod p = {gStr}<sup>{aStr}x{bStr}</sup> mod {pStr} = {aliceSecret.toString()}
            </p>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">What Eve sees vs. what she needs</p>
              <p>Eve knows: p={pStr}, g={gStr}, A={alicePub?.toString()}, B={bobPub?.toString()}</p>
              <p>Eve needs: a={aStr} or b={bStr} (the discrete logarithm of A or B)</p>
              <p>The shared secret is now used as a symmetric key (e.g., for AES) to encrypt all further communication.</p>
            </div>
          </FormulaBox>
        )}
      </StepCard>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">Limitations & real-world context</p>
        <p>
          <strong>No authentication:</strong> Basic DH doesn't verify who you're talking to. A man-in-the-middle (Eve)
          could intercept A and B, run separate DH exchanges with each party, and relay messages between them. TLS 1.3
          solves this by signing the DH exchange with ECDSA certificates.
        </p>
        <p>
          <strong>Small numbers are insecure:</strong> p=23 is used here for readability. In practice, p should be at least
          2048 bits (NIST SP 800-57). Modern protocols prefer elliptic curve DH (ECDHE) which achieves equivalent security
          with smaller keys.
        </p>
      </div>
    </div>
  );
}
