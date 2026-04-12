import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { aesGCM, bytesToHexAES, hexToBytesAES } from '@/lib/aes-math';

type Phase = 'setup' | 'encrypt1' | 'encrypt2' | 'attack';

export function GCMNonceReuse() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [keyHex, setKeyHex] = useState('000102030405060708090a0b0c0d0e0f');
  const [ivHex, setIvHex] = useState('000000000000000000000001');
  const [pt1Hex, setPt1Hex] = useState('48656c6c6f20576f726c6421'); // "Hello World!"
  const [pt2Hex, setPt2Hex] = useState('476f6f6462796520574721'); // "Goodbye WG!"
  const [error, setError] = useState('');

  const [result1, setResult1] = useState<{ ct: number[]; tag: number[]; H: number[] } | null>(null);
  const [result2, setResult2] = useState<{ ct: number[]; tag: number[] } | null>(null);
  const [xorResult, setXorResult] = useState<string>('');
  const [ptXor, setPtXor] = useState<string>('');

  function doEncrypt1() {
    setError('');
    try {
      const key = hexToBytesAES(keyHex);
      const iv = hexToBytesAES(ivHex);
      const pt = hexToBytesAES(pt1Hex);
      if (key.length !== 16 || iv.length !== 12) { setError('Key=16 bytes, IV=12 bytes'); return; }
      const r = aesGCM(pt, key, iv, []);
      setResult1({ ct: r.ciphertext, tag: r.tag, H: r.H });
      setPhase('encrypt1');
    } catch (e) { setError(String(e)); }
  }

  function doEncrypt2() {
    try {
      const key = hexToBytesAES(keyHex);
      const iv = hexToBytesAES(ivHex); // SAME IV!
      const pt = hexToBytesAES(pt2Hex);
      if (key.length !== 16 || iv.length !== 12) { setError('Key=16 bytes, IV=12 bytes'); return; }
      const r = aesGCM(pt, key, iv, []);
      setResult2({ ct: r.ciphertext, tag: r.tag });
      setPhase('encrypt2');
    } catch (e) { setError(String(e)); }
  }

  function doAttack() {
    if (!result1 || !result2) return;
    // XOR the two ciphertexts — reveals XOR of plaintexts
    const minLen = Math.min(result1.ct.length, result2.ct.length);
    const ctXor = result1.ct.slice(0, minLen).map((b, i) => b ^ result2.ct[i]);
    setXorResult(bytesToHexAES(ctXor));

    // Verify: XOR of plaintexts matches
    const p1 = hexToBytesAES(pt1Hex);
    const p2 = hexToBytesAES(pt2Hex);
    const expectedXor = p1.slice(0, minLen).map((b, i) => b ^ (p2[i] || 0));
    setPtXor(bytesToHexAES(expectedXor));

    setPhase('attack');
  }

  const getStatus = usePhaseStatus<Phase>(['setup', 'encrypt1', 'encrypt2', 'attack'], phase);

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">AES-GCM Nonce Reuse Attack</CardTitle>
          <CardDescription>
            Reusing an IV/nonce in AES-GCM is catastrophic: it leaks the XOR of plaintexts AND
            the authentication key H, enabling full plaintext recovery and tag forgery.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">AES-GCM is secure only if each (key, nonce) pair is used once. Reusing a nonce with the same key completely breaks authentication and leaks plaintext relationships.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">Two ciphertexts encrypted with the same nonce leak the XOR of plaintexts (like one-time pad reuse) and allow the attacker to recover the GHASH authentication key H, enabling forgery of arbitrary messages. A single nonce reuse is enough to compromise all past and future messages under that key.</p>
      </div>

      <StepCard step={1} title="Encrypt Message 1" status={getStatus('setup')}>
        <p className="text-xs text-muted-foreground">
          Encrypt the first message normally. The key and nonce are fixed for this demonstration.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Key (32 hex)</Label><Input value={keyHex} onChange={e => setKeyHex(e.target.value)} className="font-mono text-xs" /></div>
          <div><Label className="text-xs">IV/Nonce (24 hex)</Label><Input value={ivHex} onChange={e => setIvHex(e.target.value)} className="font-mono text-xs" /></div>
        </div>
        <div><Label className="text-xs">Plaintext 1 (hex)</Label><Input value={pt1Hex} onChange={e => setPt1Hex(e.target.value)} className="font-mono text-xs" /></div>
        <Button onClick={doEncrypt1} className="w-full">Encrypt Message 1</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result1 && (
          <FormulaBox>
            <ComputationRow label="C₁" value={bytesToHexAES(result1.ct)} highlight />
            <ComputationRow label="Tag₁" value={bytesToHexAES(result1.tag)} />
          </FormulaBox>
        )}
      </StepCard>

      <StepCard step={2} title="Encrypt Message 2 (SAME nonce!)" status={getStatus('encrypt1')}>
        <InlineWarning>Using the SAME IV/nonce for a different plaintext. This is the fatal mistake.</InlineWarning>
        <div><Label className="text-xs">Plaintext 2 (hex)</Label><Input value={pt2Hex} onChange={e => setPt2Hex(e.target.value)} className="font-mono text-xs" /></div>
        <Button onClick={doEncrypt2} className="w-full">Encrypt Message 2 (same nonce)</Button>
        {result2 && (
          <FormulaBox>
            <ComputationRow label="C₂" value={bytesToHexAES(result2.ct)} highlight />
            <ComputationRow label="Tag₂" value={bytesToHexAES(result2.tag)} />
          </FormulaBox>
        )}
      </StepCard>

      <StepCard step={3} title="Attack: XOR Ciphertexts" status={getStatus('encrypt2')}>
        <p className="text-xs text-muted-foreground">
          Since both ciphertexts were XORed with the same keystream, XORing them cancels the keystream and reveals the XOR of the two plaintexts.
        </p>
        <Button onClick={doAttack} className="w-full">XOR Ciphertexts to Recover Plaintext Relationship</Button>
      </StepCard>

      <StepCard step={4} title="Result" status={getStatus('attack')}>
        {xorResult && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="C₁ XOR C₂" value={xorResult} highlight />
              <ComputationRow label="P₁ XOR P₂" value={ptXor} highlight />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={xorResult === ptXor ? 'destructive' : 'outline'}>
                  {xorResult === ptXor ? 'PLAINTEXT XOR LEAKED' : 'MISMATCH'}
                </Badge>
              </div>
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Is Catastrophic</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                AES-GCM in CTR mode XORs plaintext with AES(key, counter). Same nonce = same counter stream.
                C₁ = P₁ XOR stream, C₂ = P₂ XOR stream → C₁ XOR C₂ = P₁ XOR P₂.
                If one plaintext is known (or partially known), the other is directly recovered.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                Worse: the GHASH authentication key H = AES(key, 0^128) is also leaked,
                enabling full tag forgery on arbitrary messages. This breaks both confidentiality AND integrity.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Never reuse a nonce. Use a random 96-bit nonce per message
                (collision probability negligible below 2^32 messages) or use a nonce-misuse-resistant
                scheme like AES-GCM-SIV.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
