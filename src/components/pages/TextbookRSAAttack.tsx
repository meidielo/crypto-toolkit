import { parseBigInt } from '@/lib/parse';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { mod, modPow } from '@/lib/ec-math';
import { rsaEncrypt, rsaDecrypt } from '@/lib/crypto-math';


type Phase = 'setup' | 'encrypt' | 'attack' | 'verify';

export function TextbookRSAAttack() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [nStr, setNStr] = useState('3233');
  const [eStr, setEStr] = useState('17');
  const [dStr, setDStr] = useState('2753');
  const [mStr, setMStr] = useState('42');

  const [ciphertext, setCiphertext] = useState<bigint | null>(null);
  const [attackResult, setAttackResult] = useState<{
    factor: bigint;
    factorE: bigint;
    tamperedC: bigint;
    tamperedM: bigint;
    originalM: bigint;
  } | null>(null);
  const [error, setError] = useState('');

  function doEncrypt() {
    setError('');
    const n = parseBigInt(nStr), e = parseBigInt(eStr), m = parseBigInt(mStr);
    if (!n || !e || m === null) { setError('Enter all parameters'); return; }
    if (m >= n) { setError('m must be < n'); return; }
    const c = rsaEncrypt(m, e, n);
    setCiphertext(c);
    setPhase('encrypt');
  }

  function doAttack() {
    setError('');
    const n = parseBigInt(nStr)!, e = parseBigInt(eStr)!, d = parseBigInt(dStr)!;
    if (!ciphertext) return;
    const m = parseBigInt(mStr);

    // Chosen-ciphertext attack: multiply ciphertext by 2^e mod n
    const factor = 2n;
    const factorE = modPow(factor, e, n); // 2^e mod n
    const tamperedC = mod(ciphertext * factorE, n); // c * 2^e mod n

    // When server decrypts c': D(c · 2^e) = D(c) · 2 = 2m — but only if 2m < n.
    // If 2m ≥ n, the multiplication wraps: D = 2m mod n, which is generally
    // odd and no longer divisible by 2. This is the real failure mode — the
    // "divisibility" check below is the *symptom*, not the cause.
    if (m !== null && 2n * m >= n) {
      setError(
        `Precondition 2m < n violated: 2m = ${(2n * m).toString()} ≥ n = ${n.toString()}. ` +
        `The attack relies on 2m not wrapping around the modulus. Pick a smaller m (e.g. m < n/2), or a larger n.`,
      );
      return;
    }

    const tamperedM = rsaDecrypt(tamperedC, d, n);

    // Safety check in case the caller fiddled with d and the two decryptions diverge.
    if (mod(tamperedM, factor) !== 0n) {
      setError(
        'Tampered plaintext is odd — the server decrypted 2m mod n, which wrapped. ' +
        'Ensure 2·m < n and that (e, d) are a valid RSA key pair.',
      );
      return;
    }
    const originalM = tamperedM / factor;

    setAttackResult({ factor, factorE, tamperedC, tamperedM, originalM });
    setPhase('verify');
  }

  const phaseOrder: Phase[] = ['setup', 'encrypt', 'attack', 'verify'];
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
          <CardTitle className="text-lg">Textbook RSA Malleability Attack</CardTitle>
          <CardDescription>
            Raw RSA (c = m^e mod n) is malleable: an attacker can transform a ciphertext to encrypt
            a related message without knowing the key. This is why RSA-OAEP padding is mandatory.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup & Encrypt" status={getStatus('setup')}>
        <InlineWarning>
          Textbook RSA has a homomorphic property: E(m1) * E(m2) = E(m1 * m2). An attacker exploits this to manipulate ciphertexts.
        </InlineWarning>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">n (modulus)</Label><Input value={nStr} onChange={e => setNStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">e (public exponent)</Label><Input value={eStr} onChange={e => setEStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">d (private exponent — server has this)</Label><Input value={dStr} onChange={e => setDStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">m (secret message)</Label><Input value={mStr} onChange={e => setMStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doEncrypt} className="w-full">Encrypt: c = m^e mod n</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Attacker Observes Ciphertext" status={getStatus('encrypt')}>
        {ciphertext !== null && (
          <FormulaBox>
            <ComputationRow label="c" formula="m^e mod n" value={ciphertext.toString()} highlight />
            <p className="text-xs text-muted-foreground mt-1">
              Attacker sees c but doesn't know m or d. However, they can MODIFY c and trick the server into decrypting the tampered version.
            </p>
          </FormulaBox>
        )}
        <Button onClick={doAttack} className="w-full">Launch Malleability Attack (multiply by 2)</Button>
      </StepCard>

      <StepCard step={3} title="Attack: Ciphertext Manipulation" status={getStatus('attack')}>
        {attackResult && (
          <div className="space-y-3">
            <FormulaBox>
              <p className="text-xs text-muted-foreground mb-2">Attacker computes:</p>
              <ComputationRow label="2^e mod n" value={attackResult.factorE.toString()} />
              <ComputationRow label="c' = c * 2^e mod n" value={attackResult.tamperedC.toString()} highlight />
              <p className="text-xs text-muted-foreground mt-2">Attacker sends c' to the server for decryption...</p>
            </FormulaBox>

            <FormulaBox>
              <p className="text-xs text-muted-foreground mb-2">Server decrypts c':</p>
              <ComputationRow label="D(c')" formula="(c')^d mod n" value={attackResult.tamperedM.toString()} />
              <ComputationRow label="= D(c * 2^e)" formula="= D(c) * 2 = m * 2" value={attackResult.tamperedM.toString()} highlight />
              <p className="text-xs text-muted-foreground mt-2">Attacker observes the decrypted value and divides by 2:</p>
              <ComputationRow label="m = D(c') / 2" value={attackResult.originalM.toString()} highlight />
            </FormulaBox>

            <div className="flex items-center gap-2">
              <Badge variant={attackResult.originalM.toString() === mStr ? 'destructive' : 'outline'}>
                {attackResult.originalM.toString() === mStr ? 'PLAINTEXT RECOVERED' : 'MISMATCH'}
              </Badge>
              <span className="text-sm font-mono">m = {attackResult.originalM.toString()}</span>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Works</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                Textbook RSA is multiplicatively homomorphic: E(a) * E(b) mod n = E(a*b).
                The attacker multiplied the ciphertext by E(2) = 2^e mod n, causing the server
                to decrypt 2m instead of m. Dividing by 2 reveals the original message.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> RSA-OAEP adds randomized padding before encryption.
                Any ciphertext modification corrupts the padding, causing decryption to fail
                rather than returning a related plaintext.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
