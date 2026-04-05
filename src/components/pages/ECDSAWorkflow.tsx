import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InlineWarning } from '@/components/SecurityBanner';
import { WebCryptoVerify } from '@/components/WebCryptoVerify';
import { webCryptoECDSASignVerify, bytesToHex } from '@/lib/web-crypto';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import {
  mod,
  scalarMultiply,
  pointAdd,
  isOnCurve,
  isInfinity,
  modInverse,
  type ECPoint,
} from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try {
    const t = s.trim();
    if (!t) return null;
    if (t.startsWith('-')) return -BigInt(t.slice(1));
    return BigInt(t);
  } catch { return null; }
}

function pointStr(P: ECPoint): string {
  if (isInfinity(P)) return 'O (infinity)';
  return `(${P.x}, ${P.y})`;
}

type Phase = 'setup' | 'hash' | 'sign' | 'verify';

export function ECDSAWorkflow() {
  const [phase, setPhase] = useState<Phase>('setup');

  // Setup
  const [pStr, setPStr] = useState('23');
  const [aStr, setAStr] = useState('1');
  const [bStr, setBStr] = useState('1');
  const [gxStr, setGxStr] = useState('0');
  const [gyStr, setGyStr] = useState('1');
  const [qStr, setQStr] = useState('28');
  const [dStr, setDStr] = useState('7');
  const [pubKey, setPubKey] = useState<ECPoint | null>(null);
  const [setupError, setSetupError] = useState('');

  // Hash
  const [message, setMessage] = useState('');
  const [lineEnding, setLineEnding] = useState<'lf' | 'crlf'>('lf');
  const [hashHex, setHashHex] = useState('');
  const [hashInt, setHashInt] = useState<bigint | null>(null);

  // Sign
  const [kStr, setKStr] = useState('3');
  const [signResult, setSignResult] = useState<{
    R: ECPoint; r: bigint; kInv: bigint; s: bigint;
    hrd: bigint;
  } | null>(null);
  const [signError, setSignError] = useState('');

  // Verify
  const [verifyResult, setVerifyResult] = useState<{
    w: bigint; u1: bigint; u2: bigint;
    u1G: ECPoint; u2Q: ECPoint; P: ECPoint;
    v: bigint; valid: boolean;
  } | null>(null);

  function doSetup() {
    setSetupError('');
    const p = parseBigInt(pStr), A = parseBigInt(aStr), B = parseBigInt(bStr);
    const gx = parseBigInt(gxStr), gy = parseBigInt(gyStr);
    const q = parseBigInt(qStr), d = parseBigInt(dStr);
    if (!p || !A || !B || gx === null || gy === null || !q || !d) {
      setSetupError('Fill in all parameters'); return;
    }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    const G: ECPoint = { x: gx, y: gy };
    if (!isOnCurve(G, A, B, p)) { setSetupError('G is not on the curve'); return; }
    try {
      const Q = scalarMultiply(d, G, A, p);
      setPubKey(Q);
      setPhase('hash');
    } catch (e) { setSetupError(String(e)); }
  }

  async function doHash() {
    let text = message;
    if (lineEnding === 'crlf') text = text.replace(/\n/g, '\r\n');
    else text = text.replace(/\r\n/g, '\n');
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    setHashHex(hex);
    setHashInt(BigInt('0x' + hex));
    setPhase('sign');
  }

  function doSign() {
    setSignError('');
    const A = parseBigInt(aStr)!, p = parseBigInt(pStr)!;
    const gx = parseBigInt(gxStr)!, gy = parseBigInt(gyStr)!;
    const q = parseBigInt(qStr)!, d = parseBigInt(dStr)!;
    const k = parseBigInt(kStr);
    if (!k || !hashInt) { setSignError('Enter nonce k'); return; }
    const G: ECPoint = { x: gx, y: gy };
    try {
      const R = scalarMultiply(k, G, A, p);
      const r = mod(R.x, q);
      if (r === 0n) { setSignError('r = 0, choose different k'); return; }
      const kInv = modInverse(k, q);
      const hrd = mod(hashInt + r * d, q);
      const s = mod(kInv * hrd, q);
      if (s === 0n) { setSignError('s = 0, choose different k'); return; }
      setSignResult({ R, r, kInv, s, hrd });
      setPhase('verify');
    } catch (e) { setSignError(String(e)); }
  }

  function doVerify() {
    if (!signResult || !hashInt) return;
    const A = parseBigInt(aStr)!, p = parseBigInt(pStr)!;
    const gx = parseBigInt(gxStr)!, gy = parseBigInt(gyStr)!;
    const q = parseBigInt(qStr)!;
    const G: ECPoint = { x: gx, y: gy };
    const { r, s } = signResult;
    try {
      const w = modInverse(s, q);
      const u1 = mod(hashInt * w, q);
      const u2 = mod(r * w, q);
      const u1G = scalarMultiply(u1, G, A, p);
      const u2Q = scalarMultiply(u2, pubKey!, A, p);
      const P = pointAdd(u1G, u2Q, A, p);
      const v = mod(P.x, q);
      setVerifyResult({ w, u1, u2, u1G, u2Q, P, v, valid: v === r });
    } catch { /* ignore */ }
  }

  const phaseOrder: Phase[] = ['setup', 'hash', 'sign', 'verify'];
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
          <CardTitle className="text-lg">ECDSA Digital Signature Workflow</CardTitle>
          <CardDescription>
            Step-by-step Elliptic Curve Digital Signature Algorithm. Each step auto-computes and shows intermediate values.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Step 1: Setup */}
      <StepCard step={1} title="Setup: Curve & Keys" status={getStatus('setup')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">A</Label><Input value={aStr} onChange={e => setAStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">B</Label><Input value={bStr} onChange={e => setBStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">p (prime)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">G.x</Label><Input value={gxStr} onChange={e => setGxStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">G.y</Label><Input value={gyStr} onChange={e => setGyStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">q (curve order)</Label><Input value={qStr} onChange={e => setQStr(e.target.value)} className="font-mono" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">d (private key)</Label><Input value={dStr} onChange={e => setDStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Compute Public Key Q = dG</Button>
        {setupError && <p className="text-sm text-destructive">{setupError}</p>}
        {pubKey && (
          <FormulaBox>
            <ComputationRow label="Q = dG" value={pointStr(pubKey)} highlight />
            <ComputationRow label="Public key" value={`(e, Q) where Q = ${pointStr(pubKey)}`} />
            <ComputationRow label="Private key" value={`d = ${dStr}`} />
          </FormulaBox>
        )}
      </StepCard>

      {/* Step 2: Hash */}
      <StepCard step={2} title="Hash the Message" status={getStatus('hash')}>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter message to sign..." rows={2} className="font-mono" />
        <div className="flex items-center gap-3">
          <Label className="text-xs">Line Endings:</Label>
          <Badge variant={lineEnding === 'lf' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setLineEnding('lf')}>LF</Badge>
          <Badge variant={lineEnding === 'crlf' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setLineEnding('crlf')}>CRLF</Badge>
          <span className="text-xs text-yellow-600 dark:text-yellow-400">Line endings change the hash!</span>
        </div>
        <Button onClick={doHash} className="w-full">Compute SHA-256 Hash</Button>
        {hashHex && (
          <FormulaBox>
            <ComputationRow label="SHA-256 (hex)" value={hashHex} />
            <ComputationRow label="H (decimal)" value={hashInt!.toString()} highlight />
          </FormulaBox>
        )}
      </StepCard>

      {/* Step 3: Sign */}
      <StepCard step={3} title="Generate Signature (r, s)" status={getStatus('sign')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">k (nonce, random)</Label><Input value={kStr} onChange={e => setKStr(e.target.value)} className="font-mono" /></div>
        </div>
        <InlineWarning>
          Nonce k MUST be cryptographically random and unique for every signature. Reusing k leaks the private key. See the Nonce Reuse Attack workflow.
        </InlineWarning>
        <Button onClick={doSign} className="w-full">Compute Signature</Button>
        {signError && <p className="text-sm text-destructive">{signError}</p>}
        {signResult && (
          <FormulaBox>
            <p className="text-xs text-muted-foreground mb-2">Signing steps:</p>
            <ComputationRow label="R = kG" value={pointStr(signResult.R)} />
            <ComputationRow label="r" formula="R.x mod q" value={signResult.r.toString()} />
            <ComputationRow label="k⁻¹ mod q" value={signResult.kInv.toString()} />
            <ComputationRow label="H + r·d mod q" value={signResult.hrd.toString()} />
            <ComputationRow label="s" formula="k⁻¹(H + r·d) mod q" value={signResult.s.toString()} highlight />
            <div className="mt-2 pt-2 border-t">
              <ComputationRow label="Signature" value={`(r, s) = (${signResult.r}, ${signResult.s})`} highlight />
            </div>
          </FormulaBox>
        )}
      </StepCard>

      {/* Step 4: Verify */}
      <StepCard step={4} title="Verify Signature" status={getStatus('verify')}>
        <Button onClick={doVerify} className="w-full">Verify Signature</Button>
        {verifyResult && (
          <FormulaBox>
            <p className="text-xs text-muted-foreground mb-2">Verification steps:</p>
            <ComputationRow label="w" formula="s⁻¹ mod q" value={verifyResult.w.toString()} />
            <ComputationRow label="u₁" formula="H·w mod q" value={verifyResult.u1.toString()} />
            <ComputationRow label="u₂" formula="r·w mod q" value={verifyResult.u2.toString()} />
            <ComputationRow label="u₁G" value={pointStr(verifyResult.u1G)} />
            <ComputationRow label="u₂Q" value={pointStr(verifyResult.u2Q)} />
            <ComputationRow label="P" formula="u₁G + u₂Q" value={pointStr(verifyResult.P)} />
            <ComputationRow label="v" formula="P.x mod q" value={verifyResult.v.toString()} highlight />
            <div className="mt-2 pt-2 border-t flex items-center gap-2">
              <Badge variant={verifyResult.valid ? 'default' : 'destructive'}>
                {verifyResult.valid ? 'VALID' : 'INVALID'}
              </Badge>
              <span className="text-sm font-mono">
                v = {verifyResult.v.toString()} {verifyResult.valid ? '==' : '!='} r = {signResult!.r.toString()}
              </span>
            </div>
          </FormulaBox>
        )}
        {verifyResult && (
          <WebCryptoVerify
            label="Verify with Web Crypto (P-256, constant-time)"
            onVerify={async () => {
              const r = await webCryptoECDSASignVerify(message || 'test');
              if (!r) return { success: false, details: ['Web Crypto ECDSA not available'] };
              return {
                success: r.verified,
                details: [
                  `Engine: ${r.engine}`,
                  `Curve: ${r.curve}`,
                  `Signature: ${bytesToHex(r.signature).substring(0, 40)}...`,
                  `Verified: ${r.verified}`,
                  `Public key X: ${r.publicKeyJwk.x}`,
                ],
              };
            }}
          />
        )}
      </StepCard>
    </div>
  );
}
