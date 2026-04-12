import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
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
  pointStr,
  type ECPoint,
} from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';

type Phase = 'setup' | 'hash' | 'sign' | 'verify';

export function ECDSAWorkflow() {
  const [phase, setPhase] = useState<Phase>('setup');

  // Setup
  // Default curve: y²=x³+x+1 mod 23. Full group has order 28 = 4×7.
  // G=(13,16) generates the prime-order subgroup of order 7.
  // ECDSA requires q prime, so we use the subgroup, not the full group.
  const [pStr, setPStr] = useState('23');
  const [aStr, setAStr] = useState('1');
  const [bStr, setBStr] = useState('1');
  const [gxStr, setGxStr] = useState('13');
  const [gyStr, setGyStr] = useState('16');
  const [qStr, setQStr] = useState('7');
  const [dStr, setDStr] = useState('3');
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
    if (!p || A === null || B === null || gx === null || gy === null || !q || !d) {
      setSetupError('Fill in all parameters'); return;
    }
    if (!isPrime(p)) { setSetupError('p must be prime'); return; }
    if (q <= 2n) { setSetupError('q (curve order) must be > 2'); return; }
    if (!isPrime(q)) { setSetupError('q (curve order) must be prime for ECDSA'); return; }
    const G: ECPoint = { x: gx, y: gy };
    if (!isOnCurve(G, A, B, p)) { setSetupError('G is not on the curve'); return; }
    // Verify G has order q (skip for large standard curves — too slow)
    if (q <= (1n << 64n)) {
      const qG = scalarMultiply(q, G, A, p);
      if (!isInfinity(qG)) { setSetupError('q is not the order of G: q*G is not infinity'); return; }
    }
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

  const [verifyError, setVerifyError] = useState('');

  function doVerify() {
    setVerifyError('');
    if (!signResult) { setVerifyError('Sign a message first (Step 3)'); return; }
    if (!hashInt) { setVerifyError('Hash a message first (Step 2)'); return; }
    const A = parseBigInt(aStr)!, p = parseBigInt(pStr)!;
    const gx = parseBigInt(gxStr)!, gy = parseBigInt(gyStr)!;
    const q = parseBigInt(qStr)!;
    const G: ECPoint = { x: gx, y: gy };
    const { r, s } = signResult;
    // ECDSA verification MUST reject out-of-range signatures (CVE-2020-0601 related)
    if (r <= 0n || r >= q) { setVerifyError(`r = ${r} is out of range [1, q-1]. Real ECDSA verification rejects this.`); return; }
    if (s <= 0n || s >= q) { setVerifyError(`s = ${s} is out of range [1, q-1]. Real ECDSA verification rejects this.`); return; }
    try {
      const w = modInverse(s, q);
      const u1 = mod(hashInt * w, q);
      const u2 = mod(r * w, q);
      const u1G = scalarMultiply(u1, G, A, p);
      const u2Q = scalarMultiply(u2, pubKey!, A, p);
      const P = pointAdd(u1G, u2Q, A, p);
      const v = mod(P.x, q);
      setVerifyResult({ w, u1, u2, u1G, u2Q, P, v, valid: v === r });
    } catch (e) {
      setVerifyError(`Verification failed: ${e}. Ensure q is prime (curve subgroup order).`);
    }
  }

  const getStatus = usePhaseStatus<Phase>(['setup', 'hash', 'sign', 'verify'], phase);

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

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">How can you prove a message came from you and hasn't been tampered with? A digital signature lets anyone with your public key verify authenticity, without needing to share a secret.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">ECDSA ties a message's hash to the signer's private key using elliptic curve math. The signature (r, s) is easy to verify with the public key but impossible to forge without the private key. ECDSA secures Bitcoin transactions, TLS certificates, and code signing.</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Step by step</summary>
          <ol className="mt-2 text-xs text-muted-foreground list-decimal list-inside space-y-1">
            <li><strong>Setup</strong> — choose a curve and generator G with prime order q. Pick a private key d, compute public key Q = dG.</li>
            <li><strong>Hash</strong> — compute H = SHA-256(message), converted to an integer.</li>
            <li><strong>Sign</strong> — pick a random nonce k, compute R = kG. The signature is r = R.x mod q and s = k<sup>-1</sup>(H + r&middot;d) mod q.</li>
            <li><strong>Verify</strong> — compute w = s<sup>-1</sup>, then check that u<sub>1</sub>G + u<sub>2</sub>Q has x-coordinate equal to r.</li>
          </ol>
        </details>
      </div>

      {/* Step 1: Setup */}
      <StepCard step={1} title="Setup: Curve & Keys" status={getStatus('setup')}>
        <p className="text-xs text-muted-foreground">The curve equation y&#178; = x&#179; + Ax + B over a prime field defines the group. G is a base point of prime order q, which is required for ECDSA's modular arithmetic to work correctly.</p>
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
        <p className="text-xs text-muted-foreground">Hashing maps the message to a fixed-size integer. ECDSA signs this hash, not the raw message, so any-length message can be signed and even a single-bit change produces a completely different signature.</p>
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
        <p className="text-xs text-muted-foreground">The nonce k must be unique and secret for every signature. In 2010, Sony reused the same k for all PS3 firmware signatures, allowing hackers to recover the private key with simple algebra. Two signatures with the same k let an attacker solve for d directly.</p>
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
            <InlineWarning>
              k⁻¹ uses extended Euclidean with data-dependent branching — timing leaks k, which leaks d.
              Production ECDSA uses crypto.subtle.sign() with constant-time Montgomery arithmetic.
            </InlineWarning>
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
        <p className="text-xs text-muted-foreground">Verification uses only the public key Q, the hash H, and the signature (r, s). If the recomputed point's x-coordinate matches r, the signature is valid. This proves the signer knew d without revealing it.</p>
        <Button onClick={doVerify} className="w-full">Verify Signature</Button>
        {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
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

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">Limitations & real-world context</p>
        <p>This demo uses a tiny curve (23-bit prime) for visibility. Real ECDSA uses P-256 or secp256k1 with ~256-bit keys, making brute force infeasible.</p>
        <p>The modular inverse here uses extended Euclidean with data-dependent branching, which leaks timing information. Production implementations use constant-time Montgomery arithmetic via crypto.subtle.sign().</p>
        <p>RFC 6979 derives k deterministically from the private key and message hash, eliminating the risk of bad randomness or nonce reuse without requiring a secure RNG at signing time.</p>
      </div>
    </div>
  );
}
