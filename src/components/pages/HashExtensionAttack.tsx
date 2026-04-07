import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { SHA256, mdPaddingBytes } from '@/lib/sha256';

type Phase = 'setup' | 'original' | 'extend' | 'verify';

export function HashExtensionAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [secret, setSecret] = useState('mysecretkey');
  const [message, setMessage] = useState('amount=100');
  const [extension, setExtension] = useState('&amount=999');
  const [error, setError] = useState('');

  const [originalHash, setOriginalHash] = useState('');
  const [internalState, setInternalState] = useState<number[]>([]);
  const [extendedHash, setExtendedHash] = useState('');
  const [serverHash, setServerHash] = useState('');
  const [paddingHex, setPaddingHex] = useState('');

  function doOriginal() {
    setError('');
    // Server computes MAC = SHA-256(secret || message)
    const hash = SHA256.hash(secret + message);
    setOriginalHash(hash);
    // Extract internal state from hash (this is what the attacker gets)
    setInternalState(SHA256.parseState(hash));
    setPhase('original');
  }

  function doExtend() {
    // REAL length extension attack:
    // 1. Parse internal state from the original hash
    // 2. Compute padding for secret||message (attacker knows/guesses secret length)
    // 3. Resume SHA-256 from that state with the extension
    // 4. The result matches SHA-256(secret || message || padding || extension)

    const originalInput = secret + message;
    const padding = mdPaddingBytes(originalInput.length);
    setPaddingHex(Array.from(padding).map(b => b.toString(16).padStart(2, '0')).join(' '));

    // Step 1: Parse the state from the original hash
    const state = SHA256.parseState(originalHash);

    // Step 2: Compute total length after secret||message||padding (all processed blocks)
    const processedLen = originalInput.length + padding.length;

    // Step 3: Create a NEW SHA-256 initialized from the captured state
    // This is the core of the attack — we resume hashing WITHOUT knowing the secret
    const extender = new SHA256(state, processedLen);
    extender.update(new TextEncoder().encode(extension));
    const forgedHash = extender.digest();
    setExtendedHash(forgedHash);

    // Step 4: Verify — server computes SHA-256(secret || message || padding || extension)
    const encoder = new TextEncoder();
    const fullInput = new Uint8Array([
      ...encoder.encode(secret + message),
      ...padding,
      ...encoder.encode(extension),
    ]);
    const serverResult = SHA256.hashBytes(fullInput);
    setServerHash(serverResult);

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
            SHA-256 uses Merkle-Damgard construction: the hash output IS the internal state.
            An attacker who sees H(secret || message) can resume hashing to compute
            H(secret || message || padding || extension) WITHOUT knowing the secret.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup: Server's MAC Scheme" status={getStatus('setup')}>
        <InlineWarning>
          The server uses MAC = SHA-256(secret || message). This is vulnerable because SHA-256's
          final internal state (h0..h7) is directly exposed as the hash output. An attacker
          can initialize a new SHA-256 instance from this state and continue hashing.
        </InlineWarning>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Secret key (server-side, unknown to attacker)</Label><Input value={secret} onChange={e => setSecret(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">Original message</Label><Input value={message} onChange={e => setMessage(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doOriginal} className="w-full">Compute MAC = SHA-256(secret || message)</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Attacker Captures Hash → Internal State" status={getStatus('original')}>
        {originalHash && (
          <FormulaBox>
            <ComputationRow label="Message" value={message} />
            <ComputationRow label="MAC (hash)" value={originalHash} highlight />
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Extracted internal state (h0..h7):</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {internalState.map((w, i) => (
                  <div key={i} className="text-[10px] font-mono bg-muted/50 rounded px-1.5 py-0.5 text-center">
                    h{i} = {w.toString(16).padStart(8, '0')}
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-500 mt-2">
                These 8 words ARE the complete SHA-256 internal state. The attacker can resume hashing from here.
              </p>
            </div>
          </FormulaBox>
        )}
        <div>
          <Label className="text-xs">Extension to append</Label>
          <Input value={extension} onChange={e => setExtension(e.target.value)} className="font-mono" />
        </div>
        <Button onClick={doExtend} className="w-full">Forge Extended MAC (without knowing secret)</Button>
      </StepCard>

      <StepCard step={3} title="Attack: Resume SHA-256 from Captured State" status={getStatus('extend')}>
        {extendedHash && (
          <div className="space-y-3">
            <FormulaBox>
              <p className="text-xs text-muted-foreground mb-2">Attack steps (no secret knowledge required):</p>
              <ComputationRow label="1. Parse state" value={`[${internalState.map(w => w.toString(16).padStart(8, '0')).join(', ')}]`} />
              <ComputationRow label="2. MD padding" value={paddingHex} />
              <ComputationRow label="3. Resume SHA-256" value={`new SHA256(state, ${secret.length + message.length + mdPaddingBytes(secret.length + message.length).length})`} />
              <ComputationRow label="4. Hash extension" value={`update("${extension}").digest()`} />
              <div className="mt-2 pt-2 border-t">
                <ComputationRow label="Forged MAC" value={extendedHash} highlight />
                <ComputationRow label="Server verify" value={serverHash} highlight />
              </div>
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Badge variant={extendedHash === serverHash ? 'destructive' : 'outline'}>
                  {extendedHash === serverHash ? 'MAC FORGED — HASHES MATCH' : 'MISMATCH'}
                </Badge>
              </div>
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">This Is a Real Attack</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                This demo uses a custom SHA-256 implementation with exposed internal state.
                The attacker's hash was computed by initializing SHA-256 from the captured state
                and continuing — NOT by knowing the secret. The forged MAC matches because
                Merkle-Damgard processes data as independent blocks.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Use HMAC: H(key XOR opad || H(key XOR ipad || message)).
                HMAC's double-hashing construction prevents length extension because the outer hash
                obscures the internal state. The attacker cannot resume from a nested hash.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
