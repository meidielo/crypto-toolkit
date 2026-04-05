import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';

type Phase = 'setup' | 'original' | 'extend' | 'verify';

export function HashExtensionAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [secret, setSecret] = useState('mysecretkey');
  const [message, setMessage] = useState('amount=100');
  const [extension, setExtension] = useState('&amount=999');
  const [error, setError] = useState('');

  const [originalHash, setOriginalHash] = useState('');
  const [extendedHash, setExtendedHash] = useState('');
  const [serverHash, setServerHash] = useState('');
  const [_forgedMessage, setForgedMessage] = useState('');

  async function sha256(data: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Compute MD padding for Merkle-Damgard construction
  function mdPadding(msgLen: number): string {
    // SHA-256 padding: append 0x80, then zeros, then 64-bit big-endian length
    const bitLen = msgLen * 8;
    let padding = '\x80';
    // Pad to 56 mod 64 bytes
    const totalLen = msgLen + 1;
    const padZeros = (56 - (totalLen % 64) + 64) % 64;
    padding += '\x00'.repeat(padZeros);
    // 8-byte big-endian bit length
    for (let i = 7; i >= 0; i--) {
      padding += String.fromCharCode((bitLen >> (i * 8)) & 0xff);
    }
    return padding;
  }

  async function doOriginal() {
    setError('');
    const hash = await sha256(secret + message);
    setOriginalHash(hash);
    setPhase('original');
  }

  async function doExtend() {
    // The attacker knows: message, originalHash, len(secret) (or guesses it)
    // They forge: secret || message || padding || extension
    // The hash of the forged message equals H(original_state || extension)
    const originalInput = secret + message;
    const padding = mdPadding(originalInput.length);

    // Forged message (what the server will see): message || padding || extension
    const forged = message + padding + extension;
    setForgedMessage(forged);

    // The CORRECT hash (what the server computes): SHA-256(secret || forged)
    const serverVerify = await sha256(secret + forged);
    setServerHash(serverVerify);

    // What the attacker computes: SHA-256(secret || message || padding || extension)
    // This equals SHA-256(secret || forged) due to Merkle-Damgard
    const attackerHash = await sha256(secret + message + padding + extension);
    setExtendedHash(attackerHash);

    setPhase('verify');
  }

  const phaseOrder: Phase[] = ['setup', 'original', 'extend', 'verify'];
  const phaseIdx = phaseOrder.indexOf(phase);
  function getStatus(p: Phase): 'pending' | 'active' | 'complete' {
    const idx = phaseOrder.indexOf(p);
    if (idx < phaseIdx) return 'complete';
    if (idx === phaseIdx) return 'active';
    return 'pending';
  }

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Hash Length Extension Attack</CardTitle>
          <CardDescription>
            SHA-256 uses Merkle-Damgard construction: H(secret || message) can be extended to
            H(secret || message || padding || extension) WITHOUT knowing the secret.
            This breaks naive MAC schemes that use H(key || message).
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup: Server's MAC Scheme" status={getStatus('setup')}>
        <InlineWarning>
          The server uses MAC = SHA-256(secret || message). This is vulnerable because SHA-256's
          Merkle-Damgard construction processes data in blocks. The final internal state after
          hashing is exposed as the hash output.
        </InlineWarning>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Secret key (server-side, unknown to attacker)</Label><Input value={secret} onChange={e => setSecret(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Original message</Label><Input value={message} onChange={e => setMessage(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doOriginal} className="w-full">Compute MAC = SHA-256(secret || message)</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Attacker Observes MAC" status={getStatus('original')}>
        {originalHash && (
          <FormulaBox>
            <ComputationRow label="Message" value={message} />
            <ComputationRow label="MAC" value={originalHash} highlight />
            <p className="text-xs text-muted-foreground mt-2">
              The attacker sees the message and MAC but NOT the secret.
              They want to forge a MAC for message + extension.
            </p>
          </FormulaBox>
        )}
        <div>
          <Label className="text-xs">Extension to append</Label>
          <Input value={extension} onChange={e => setExtension(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doExtend} className="w-full">Forge Extended MAC (without knowing secret)</Button>
      </StepCard>

      <StepCard step={3} title="Attack Result" status={getStatus('extend')}>
        {extendedHash && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Original message" value={message} />
              <ComputationRow label="Forged message" value={`${message}[padding]${extension}`} />
              <ComputationRow label="Attacker's forged MAC" value={extendedHash} highlight />
              <ComputationRow label="Server's verification" value={serverHash} highlight />
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={extendedHash === serverHash ? 'destructive' : 'outline'}>
                  {extendedHash === serverHash ? 'MAC FORGED SUCCESSFULLY' : 'MISMATCH'}
                </Badge>
              </div>
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">How This Works</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                SHA-256 processes data in 64-byte blocks. After processing secret||message, the internal
                state IS the hash output. The attacker uses this output as the initial state for a new
                SHA-256 computation, appending the padding and extension. The result equals what the
                server would compute for SHA-256(secret || message || padding || extension).
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Use HMAC: H(key XOR opad || H(key XOR ipad || message)).
                HMAC's double-hashing construction prevents length extension because the outer hash
                obscures the internal state.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
