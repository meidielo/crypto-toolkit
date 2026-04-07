import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { webCryptoECDH, hkdfExtract, hkdfExpand, bytesToHex, webCryptoAESGCM } from '@/lib/web-crypto';

type Phase = 'hello' | 'keyexchange' | 'derive' | 'auth' | 'appdata' | 'done';

export function TLS13Workflow() {
  const [phase, setPhase] = useState<Phase>('hello');
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState('');

  // Key Exchange
  const [clientPubX, setClientPubX] = useState('');
  const [serverPubX, setServerPubX] = useState('');
  const [sharedSecret, setSharedSecret] = useState('');

  // Key Derivation
  const [earlySecret, setEarlySecret] = useState('');
  const [handshakeSecret, setHandshakeSecret] = useState('');
  const [clientKey, setClientKey] = useState('');
  const [serverKey, setServerKey] = useState('');

  // Auth
  const [transcriptHash, setTranscriptHash] = useState('');
  const [serverSigHex, setServerSigHex] = useState('');
  const [serverCertPubX, setServerCertPubX] = useState('');
  const [serverSigValid, setServerSigValid] = useState(false);

  // App Data
  const [appMessage, setAppMessage] = useState('Hello from client!');
  const [encryptedMsg, setEncryptedMsg] = useState('');
  const [authTag, setAuthTag] = useState('');

  async function doKeyExchange() {
    setComputing(true);
    setError('');
    try {
      const result = await webCryptoECDH();
      if (!result) { setError('ECDH failed'); setComputing(false); return; }
      setClientPubX(result.clientPublicJwk.x || '');
      setServerPubX(result.serverPublicJwk.x || '');
      setSharedSecret(bytesToHex(result.sharedSecret));
      setPhase('keyexchange');
    } catch (e) { setError(String(e)); }
    setComputing(false);
  }

  async function doDeriveKeys() {
    setComputing(true);
    try {
      const sharedBytes = new Uint8Array(sharedSecret.match(/.{2}/g)!.map(h => parseInt(h, 16)));

      // HKDF-Extract: Early Secret = HKDF-Extract(0, 0)
      const zeroSalt = new Uint8Array(32);
      const zeroIKM = new Uint8Array(32);
      const early = await hkdfExtract(zeroSalt, zeroIKM);
      setEarlySecret(bytesToHex(early));

      // HKDF-Extract: Handshake Secret = HKDF-Extract(derived_early, shared_secret)
      const derivedEarly = await hkdfExpand(early, new TextEncoder().encode('tls13 derived'), 32);
      const handshake = await hkdfExtract(derivedEarly, sharedBytes);
      setHandshakeSecret(bytesToHex(handshake));

      // Derive client/server handshake traffic keys
      const cKey = await hkdfExpand(handshake, new TextEncoder().encode('tls13 c hs traffic'), 16);
      const sKey = await hkdfExpand(handshake, new TextEncoder().encode('tls13 s hs traffic'), 16);
      setClientKey(bytesToHex(cKey));
      setServerKey(bytesToHex(sKey));

      setPhase('derive');
    } catch (e) { setError(String(e)); }
    setComputing(false);
  }

  async function doAuth() {
    setComputing(true);
    try {
      // Simulate transcript hash (hash of all handshake messages)
      const transcript = new TextEncoder().encode(`ClientHello|ServerHello|${sharedSecret}`);
      const hashBuf = await crypto.subtle.digest('SHA-256', transcript);
      const hash = bytesToHex(new Uint8Array(hashBuf));
      setTranscriptHash(hash);

      // Server signs transcript with ECDSA P-256 (real TLS 1.3 uses certificate's private key)
      const certKeys = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const certPubJwk = await crypto.subtle.exportKey('jwk', certKeys.publicKey);
      setServerCertPubX(certPubJwk.x || '');
      const hashBufCopy = hashBuf.slice(0) as ArrayBuffer;
      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        certKeys.privateKey,
        hashBufCopy
      );
      setServerSigHex(bytesToHex(new Uint8Array(signature)).substring(0, 40) + '...');
      const verified = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        certKeys.publicKey,
        signature,
        hashBuf
      );
      setServerSigValid(verified);

      setPhase('auth');
    } catch (e) { setError(String(e)); }
    setComputing(false);
  }

  async function doAppData() {
    setComputing(true);
    try {
      const keyBytes = new Uint8Array(clientKey.match(/.{2}/g)!.map(h => parseInt(h, 16)));
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      const ptBytes = new TextEncoder().encode(appMessage);
      const aad = new TextEncoder().encode('TLS 1.3 Application Data');

      const result = await webCryptoAESGCM(ptBytes, keyBytes, iv, aad);
      if (result) {
        setEncryptedMsg(bytesToHex(result.ciphertext));
        setAuthTag(bytesToHex(result.tag));
      }
      setPhase('done');
    } catch (e) { setError(String(e)); }
    setComputing(false);
  }

  const phaseOrder: Phase[] = ['hello', 'keyexchange', 'derive', 'auth', 'appdata', 'done'];
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
          <CardTitle className="text-lg">TLS 1.3 Handshake Simulation</CardTitle>
          <CardDescription>
            A complete TLS 1.3 handshake combining ECDHE key exchange, HKDF key derivation,
            server authentication, and AES-GCM encrypted application data. This is how HTTPS works.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Two-column: Client | Server */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="text-center"><Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" variant="outline">Client</Badge></div>
        <div className="text-center"><Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" variant="outline">Server</Badge></div>
      </div>

      {/* Step 1: ClientHello + ServerHello */}
      <StepCard step={1} title="ClientHello → ServerHello (ECDHE Key Exchange)" status={getStatus('hello')}>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Both sides generate ephemeral ECDH key pairs on P-256 and exchange public keys.
          </p>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">ECDH</Badge>
            <Badge variant="outline" className="text-xs">P-256</Badge>
          </div>
          <Button onClick={doKeyExchange} disabled={computing} className="w-full">
            {computing ? 'Generating keys...' : 'Exchange ECDH Keys'}
          </Button>
        </div>
      </StepCard>

      {/* Step 2: Show key exchange result */}
      <StepCard step={2} title="Shared Secret Computed" status={getStatus('keyexchange')}>
        {sharedSecret && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Client pub (x)" value={clientPubX} />
              <ComputationRow label="Server pub (x)" value={serverPubX} />
              <ComputationRow label="Shared secret" value={sharedSecret.substring(0, 40) + '...'} highlight />
              <p className="text-xs text-muted-foreground mt-1">Both sides computed the same shared secret independently via ECDH.</p>
            </FormulaBox>
            <Button onClick={doDeriveKeys} disabled={computing} className="w-full">
              {computing ? 'Deriving...' : 'Derive Handshake Keys (HKDF)'}
            </Button>
          </div>
        )}
      </StepCard>

      {/* Step 3: HKDF Key Derivation */}
      <StepCard step={3} title="Key Derivation (HKDF-SHA256)" status={getStatus('derive')}>
        {handshakeSecret && (
          <div className="space-y-3">
            <div className="flex gap-2"><Badge variant="outline" className="text-xs">HKDF</Badge><Badge variant="outline" className="text-xs">SHA-256</Badge></div>
            <FormulaBox>
              <ComputationRow label="Early Secret" formula="HKDF-Extract(0, 0)" value={earlySecret.substring(0, 32) + '...'} />
              <ComputationRow label="Handshake Secret" formula="HKDF-Extract(derived, shared)" value={handshakeSecret.substring(0, 32) + '...'} highlight />
              <div className="mt-2 pt-2 border-t">
                <ComputationRow label="Client key (16B)" value={clientKey} highlight />
                <ComputationRow label="Server key (16B)" value={serverKey} highlight />
              </div>
            </FormulaBox>
            <Button onClick={doAuth} disabled={computing} className="w-full">
              {computing ? 'Authenticating...' : 'Server Authentication'}
            </Button>
          </div>
        )}
      </StepCard>

      {/* Step 4: Server Authentication */}
      <StepCard step={4} title="Server Authentication (Signature Verification)" status={getStatus('auth')}>
        {transcriptHash && (
          <div className="space-y-3">
            <div className="flex gap-2"><Badge variant="outline" className="text-xs">ECDSA</Badge><Badge variant="outline" className="text-xs">SHA-256</Badge></div>
            <FormulaBox>
              <ComputationRow label="Transcript hash" value={transcriptHash.substring(0, 40) + '...'} />
              <ComputationRow label="Server cert pub (x)" value={serverCertPubX} />
              <ComputationRow label="ECDSA signature" value={serverSigHex} />
              <ComputationRow label="Verification" value={serverSigValid ? 'VALID' : 'INVALID'} highlight />
              <p className="text-xs text-muted-foreground mt-1">
                Uses real ECDSA P-256 via crypto.subtle.sign/verify (constant-time native).
                In production TLS 1.3, the server's key comes from a CA-signed X.509 certificate.
              </p>
            </FormulaBox>
            <div>
              <Label className="text-xs">Application message to encrypt</Label>
              <Input value={appMessage} onChange={e => setAppMessage(e.target.value)} className="font-mono" />
            </div>
            <Button onClick={doAppData} disabled={computing} className="w-full">
              {computing ? 'Encrypting...' : 'Encrypt Application Data (AES-GCM)'}
            </Button>
          </div>
        )}
      </StepCard>

      {/* Step 5: Application Data */}
      <StepCard step={5} title="Encrypted Application Data" status={getStatus('appdata')}>
        {encryptedMsg && (
          <div className="space-y-3">
            <div className="flex gap-2"><Badge variant="outline" className="text-xs">AES-GCM</Badge><Badge variant="outline" className="text-xs">128-bit</Badge></div>
            <FormulaBox>
              <ComputationRow label="Plaintext" value={appMessage} />
              <ComputationRow label="Key (client)" value={clientKey} />
              <ComputationRow label="Ciphertext" value={encryptedMsg} highlight />
              <ComputationRow label="Auth tag" value={authTag} highlight />
            </FormulaBox>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-green-600 dark:text-green-400">TLS 1.3 Handshake Complete</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/70">
                This simulation demonstrated the complete TLS 1.3 pipeline:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">ECDH P-256</Badge>
                  <span className="text-muted-foreground">Key Exchange</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-500 border-purple-500/30">HKDF-SHA256</Badge>
                  <span className="text-muted-foreground">Key Derivation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/30">ECDSA</Badge>
                  <span className="text-muted-foreground">Authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-500 border-orange-500/30">AES-128-GCM</Badge>
                  <span className="text-muted-foreground">Encryption</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
