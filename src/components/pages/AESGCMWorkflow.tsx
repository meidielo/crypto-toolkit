import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { WebCryptoVerify } from '@/components/WebCryptoVerify';
import { aesGCM, bytesToHexAES, hexToBytesAES, type AESGCMResult } from '@/lib/aes-math';
import { webCryptoAESGCM, bytesToHex } from '@/lib/web-crypto';

type Phase = 'input' | 'ctr' | 'ghash' | 'tag';

export function AESGCMWorkflow() {
  const [phase, setPhase] = useState<Phase>('input');
  const [keyHex, setKeyHex] = useState('000102030405060708090a0b0c0d0e0f');
  const [ivHex, setIvHex] = useState('000000000000000000000001');
  const [ptHex, setPtHex] = useState('48656c6c6f20576f726c6421'); // "Hello World!"
  const [aadHex, setAadHex] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AESGCMResult | null>(null);

  function doEncrypt() {
    setError('');
    try {
      const key = hexToBytesAES(keyHex);
      const iv = hexToBytesAES(ivHex);
      const pt = hexToBytesAES(ptHex);
      const aad = aadHex ? hexToBytesAES(aadHex) : [];
      if (key.length !== 16) { setError('Key must be 16 bytes (32 hex chars)'); return; }
      if (iv.length !== 12) { setError('IV must be 12 bytes (24 hex chars)'); return; }
      const r = aesGCM(pt, key, iv, aad);
      setResult(r);
      setPhase('ctr');
    } catch (e) { setError(String(e)); }
  }

  const phaseOrder: Phase[] = ['input', 'ctr', 'ghash', 'tag'];
  const getStatus = usePhaseStatus<Phase>(phaseOrder, phase);
  function advance() {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) setPhase(phaseOrder[idx + 1]);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">AES-GCM Authenticated Encryption</CardTitle>
          <CardDescription>
            Galois/Counter Mode combines AES-CTR encryption with GHASH polynomial authentication.
            This is the cipher suite used in TLS 1.3, AWS encryption, and HTTPS.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">AES-CBC encrypts but does not authenticate -- attackers can tamper with ciphertext undetected. Padding oracle attacks (Vaudenay 2002) showed that unauthenticated CBC decryption leaks plaintext byte-by-byte.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">GCM combines CTR mode encryption with GHASH authentication, producing a tag that detects any modification to the ciphertext or additional authenticated data. The nonce must never repeat with the same key -- reuse breaks both confidentiality and authenticity.</p>
      </div>

      {/* Input */}
      <StepCard step={1} title="Input: Key, IV, Plaintext, AAD" status={getStatus('input')}>
        <p className="text-xs text-muted-foreground">
          GCM requires a 128-bit key, a 96-bit nonce (IV), and optionally Additional Authenticated Data (AAD) that is authenticated but not encrypted.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Key (32 hex = 16 bytes)</Label><Input value={keyHex} onChange={e => setKeyHex(e.target.value)} className="font-mono text-xs" /></div>
          <div><Label className="text-xs">IV/Nonce (24 hex = 12 bytes)</Label><Input value={ivHex} onChange={e => setIvHex(e.target.value)} className="font-mono text-xs" /></div>
        </div>
        <div><Label className="text-xs">Plaintext (hex)</Label><Input value={ptHex} onChange={e => setPtHex(e.target.value)} className="font-mono text-xs" /></div>
        <div><Label className="text-xs">AAD - Additional Authenticated Data (hex, optional)</Label><Input value={aadHex} onChange={e => setAadHex(e.target.value)} className="font-mono text-xs" /></div>
        <Button onClick={doEncrypt} className="w-full">Encrypt with AES-GCM</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {/* CTR Mode */}
      <StepCard step={2} title="Counter Mode (Stream Cipher)" status={getStatus('ctr')}>
        {result && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              AES-CTR turns the block cipher into a stream cipher. Each counter value is encrypted, then XORed with the plaintext block.
            </p>
            <FormulaBox>
              {result.ctrBlocks.map((block, i) => (
                <div key={i} className="border-b last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                  <ComputationRow label={`Counter ${i}`} value={bytesToHexAES(block.counter)} />
                  <ComputationRow label="AES(counter)" value={bytesToHexAES(block.encryptedCounter)} />
                  <ComputationRow label="Plaintext" value={bytesToHexAES(block.plaintextBlock)} />
                  <ComputationRow label="Ciphertext" formula="AES(ctr) XOR pt" value={bytesToHexAES(block.ciphertextBlock)} highlight />
                </div>
              ))}
            </FormulaBox>
            <Button onClick={advance} variant="outline" className="w-full">Next: GHASH Authentication →</Button>
          </div>
        )}
      </StepCard>

      {/* GHASH */}
      <StepCard step={3} title="GHASH (Polynomial Authentication over GF(2^128))" status={getStatus('ghash')}>
        {result && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              GHASH computes a MAC by multiplying ciphertext blocks in GF(2^128). H = AES_K(0^128) is the hash key.
            </p>
            <FormulaBox>
              <ComputationRow label="H = AES_K(0)" value={bytesToHexAES(result.H)} highlight />
              <div className="mt-2 space-y-2">
                {result.ghashSteps.map((step, i) => (
                  <div key={i} className="border-t pt-2">
                    <ComputationRow label={`Block ${step.blockIndex}`} value={bytesToHexAES(step.input)} />
                    <ComputationRow label="X XOR block" value={bytesToHexAES(step.xorResult)} />
                    <ComputationRow label="(X XOR block) · H" value={bytesToHexAES(step.mulResult)} highlight />
                  </div>
                ))}
              </div>
            </FormulaBox>
            <Button onClick={advance} variant="outline" className="w-full">Next: Final Tag →</Button>
          </div>
        )}
      </StepCard>

      {/* Final Tag */}
      <StepCard step={4} title="Authentication Tag" status={getStatus('tag')}>
        {result && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="GHASH result" value={bytesToHexAES(result.ghashSteps[result.ghashSteps.length - 1]?.mulResult || [])} />
              <ComputationRow label="E(K, J0)" value={`AES_K(${bytesToHexAES(result.J0)})`} />
              <ComputationRow label="Tag" formula="GHASH XOR E(K, J0)" value={bytesToHexAES(result.tag)} highlight />
              <div className="mt-3 pt-3 border-t">
                <ComputationRow label="Ciphertext" value={bytesToHexAES(result.ciphertext)} highlight />
                <ComputationRow label="Auth Tag" value={bytesToHexAES(result.tag)} highlight />
              </div>
            </FormulaBox>
            <WebCryptoVerify
              label="Verify with Web Crypto AES-GCM (constant-time)"
              onVerify={async () => {
                const key = new Uint8Array(hexToBytesAES(keyHex));
                const iv = new Uint8Array(hexToBytesAES(ivHex));
                const pt = new Uint8Array(hexToBytesAES(ptHex));
                const aad = aadHex ? new Uint8Array(hexToBytesAES(aadHex)) : new Uint8Array(0);
                const r = await webCryptoAESGCM(pt, key, iv, aad);
                if (!r) return { success: false, details: ['Web Crypto AES-GCM failed'] };
                const ourCt = bytesToHexAES(result!.ciphertext);
                const wcCt = bytesToHex(r.ciphertext);
                const match = ourCt === wcCt;
                return {
                  success: match,
                  details: [
                    `Engine: Web Crypto AES-GCM (constant-time native)`,
                    `Web Crypto ciphertext: ${wcCt}`,
                    `Our BigInt ciphertext: ${ourCt}`,
                    `Ciphertext match: ${match}`,
                    `Web Crypto tag: ${bytesToHex(r.tag)}`,
                    `Our tag: ${bytesToHexAES(result!.tag)}`,
                  ],
                };
              }}
            />
          </div>
        )}
      </StepCard>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">Limitations & real-world context</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>This implementation uses BigInt arithmetic for educational clarity. Production systems use constant-time native implementations (like Web Crypto) to prevent timing side channels.</li>
          <li>GCM nonces must never repeat with the same key. For random 96-bit nonces, the birthday bound limits safe usage to about 2^32 messages per key.</li>
          <li>GCM's authentication strength degrades with long messages. NIST SP 800-38D recommends limiting plaintext to 2^39 - 256 bits per invocation.</li>
          <li>AES-GCM-SIV (RFC 8452) is a nonce-misuse-resistant alternative -- it remains secure if a nonce is accidentally reused, at the cost of slightly more computation.</li>
        </ul>
      </div>
    </div>
  );
}
