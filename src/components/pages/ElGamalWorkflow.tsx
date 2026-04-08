import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { mod, modPow, modInverse, isPrime, discreteLogBounded } from '@/lib/crypto-math';


type Phase = 'setup' | 'encrypt' | 'homomorphic' | 'decrypt';

export function ElGamalWorkflow() {
  const [phase, setPhase] = useState<Phase>('setup');

  // Setup
  const [pStr, setPStr] = useState('6451');
  const [gStr, setGStr] = useState('4599');
  const [xStr, setXStr] = useState('193');
  const [yVal, setYVal] = useState<bigint | null>(null);
  const [setupError, setSetupError] = useState('');

  // Encrypt
  const [mStr, setMStr] = useState('20');
  const [rStr, setRStr] = useState('155');
  const [encResult, setEncResult] = useState<{
    c1: bigint; c2: bigint; yr: bigint; gm: bigint;
  } | null>(null);

  // Encrypt 2 (for homomorphic demo)
  const [m2Str, setM2Str] = useState('25');
  const [r2Str, setR2Str] = useState('156');
  const [enc2Result, setEnc2Result] = useState<{
    c1: bigint; c2: bigint;
  } | null>(null);
  const [homoResult, setHomoResult] = useState<{
    c1: bigint; c2: bigint;
  } | null>(null);

  // Decrypt
  const [decC1Str, setDecC1Str] = useState('');
  const [decC2Str, setDecC2Str] = useState('');
  const [decResult, setDecResult] = useState<{
    s: bigint; sInv: bigint; gm: bigint; m: bigint | null;
  } | null>(null);

  function doSetup() {
    setSetupError('');
    const p = parseBigInt(pStr), g = parseBigInt(gStr), x = parseBigInt(xStr);
    if (!p || !g || !x) { setSetupError('Enter all parameters'); return; }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    const y = modPow(g, x, p);
    setYVal(y);
    setPhase('encrypt');
  }

  function doEncrypt() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!;
    const m = parseBigInt(mStr), r = parseBigInt(rStr);
    if (m === null || !r || !yVal) return;
    const c1 = modPow(g, r, p);
    const yr = modPow(yVal, r, p);
    const gm = modPow(g, m, p);
    const c2 = mod(yr * gm, p);
    setEncResult({ c1, c2, yr, gm });
    setDecC1Str(c1.toString());
    setDecC2Str(c2.toString());
    setPhase('homomorphic');
  }

  function doEncrypt2() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!;
    const m2 = parseBigInt(m2Str), r2 = parseBigInt(r2Str);
    if (m2 === null || !r2 || !yVal) return;
    const c1 = modPow(g, r2, p);
    const yr = modPow(yVal, r2, p);
    const gm = modPow(g, m2, p);
    const c2 = mod(yr * gm, p);
    setEnc2Result({ c1, c2 });
  }

  function doHomomorphic() {
    if (!encResult || !enc2Result) return;
    const p = parseBigInt(pStr)!;
    const c1 = mod(encResult.c1 * enc2Result.c1, p);
    const c2 = mod(encResult.c2 * enc2Result.c2, p);
    setHomoResult({ c1, c2 });
    setDecC1Str(c1.toString());
    setDecC2Str(c2.toString());
    setPhase('decrypt');
  }

  function doDecrypt() {
    const p = parseBigInt(pStr)!, g = parseBigInt(gStr)!, x = parseBigInt(xStr)!;
    const c1 = parseBigInt(decC1Str), c2 = parseBigInt(decC2Str);
    if (!c1 || !c2) return;
    const s = modPow(c1, x, p);
    const sInv = modInverse(s, p);
    const gm = mod(c2 * sInv, p);
    const m = discreteLogBounded(g, gm, p, 10000);
    setDecResult({ s, sInv, gm, m });
  }

  const phaseOrder: Phase[] = ['setup', 'encrypt', 'homomorphic', 'decrypt'];
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
          <CardTitle className="text-lg">Exponential ElGamal Cryptosystem</CardTitle>
          <CardDescription>
            Homomorphic encryption: multiplying ciphertexts adds the plaintexts. Uses bounded discrete log for small messages.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup */}
      <StepCard step={1} title="Setup: Public & Private Keys" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">p (prime)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">g (generator)</Label><Input value={gStr} onChange={e => setGStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">x (private key)</Label><Input value={xStr} onChange={e => setXStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Compute y = g^x mod p</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
        {yVal !== null && (
          <FormulaBox>
            <ComputationRow label="y" formula="g^x mod p" value={yVal.toString()} highlight />
            <ComputationRow label="Public key" value={`(p, g, y) = (${pStr}, ${gStr}, ${yVal})`} />
            <ComputationRow label="Private key" value={`x = ${xStr}`} />
          </FormulaBox>
        )}
      </StepCard>

      {/* Encrypt */}
      <StepCard step={2} title="Encrypt Message" status={getStatus('encrypt')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">m (message, must be &lt; 10000 for decryption)</Label><Input value={mStr} onChange={e => setMStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">r (random nonce)</Label><Input value={rStr} onChange={e => setRStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doEncrypt} className="w-full">Encrypt: (c₁, c₂) = (g^r, y^r · g^m)</Button>
        {encResult && (
          <FormulaBox>
            <ComputationRow label="c₁" formula="g^r mod p" value={encResult.c1.toString()} />
            <ComputationRow label="y^r mod p" value={encResult.yr.toString()} />
            <ComputationRow label="g^m mod p" value={encResult.gm.toString()} />
            <ComputationRow label="c₂" formula="y^r · g^m mod p" value={encResult.c2.toString()} />
            <div className="mt-2 pt-2 border-t">
              <ComputationRow label="Ciphertext" value={`(${encResult.c1}, ${encResult.c2})`} highlight />
            </div>
          </FormulaBox>
        )}
      </StepCard>

      {/* Homomorphic */}
      <StepCard step={3} title="Homomorphic Addition" status={getStatus('homomorphic')}>
        <p className="text-xs text-muted-foreground">Encrypt a second message, then multiply ciphertexts to add plaintexts.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">m₂</Label><Input value={m2Str} onChange={e => setM2Str(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">r₂</Label><Input value={r2Str} onChange={e => setR2Str(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doEncrypt2} variant="outline" className="w-full">Encrypt m₂</Button>
        {enc2Result && (
          <FormulaBox>
            <ComputationRow label="E(m₂)" value={`(${enc2Result.c1}, ${enc2Result.c2})`} />
          </FormulaBox>
        )}
        {enc2Result && (
          <Button onClick={doHomomorphic} className="w-full">
            Multiply: E(m₁) × E(m₂) = E(m₁ + m₂)
          </Button>
        )}
        {homoResult && (
          <FormulaBox>
            <ComputationRow label="Combined" value={`(${homoResult.c1}, ${homoResult.c2})`} highlight />
            <p className="text-xs text-muted-foreground">This encrypts m₁ + m₂ = {mStr} + {m2Str} = {(parseBigInt(mStr)! + parseBigInt(m2Str)!).toString()}</p>
          </FormulaBox>
        )}
      </StepCard>

      {/* Decrypt */}
      <StepCard step={4} title="Decrypt" status={getStatus('decrypt')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">c₁</Label><Input value={decC1Str} onChange={e => setDecC1Str(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">c₂</Label><Input value={decC2Str} onChange={e => setDecC2Str(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doDecrypt} className="w-full">Decrypt</Button>
        {decResult && (
          <FormulaBox>
            <ComputationRow label="s" formula="c₁^x mod p" value={decResult.s.toString()} />
            <ComputationRow label="s⁻¹ mod p" value={decResult.sInv.toString()} />
            <ComputationRow label="g^m" formula="c₂ · s⁻¹ mod p" value={decResult.gm.toString()} />
            <ComputationRow label="m" formula="dlog(g^m)" value={decResult.m !== null ? decResult.m.toString() : 'Not found — m exceeds bounded search (max 10000). Exponential ElGamal requires small messages for decryption via discrete log.'} highlight />
          </FormulaBox>
        )}
      </StepCard>
    </div>
  );
}
