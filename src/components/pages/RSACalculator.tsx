import { parseBigInt } from '@/lib/parse';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { WebCryptoVerify } from '@/components/WebCryptoVerify';
import { webCryptoRSAEncryptDecrypt, bytesToHex } from '@/lib/web-crypto';
import {
  rsaEncrypt,
  rsaDecrypt,
  isPrime,
  gcd,
  modInverse,
  mod,
  type RSAKeyPair,
} from '@/lib/crypto-math';
import CryptoWorker from '@/workers/crypto.worker?worker';

// Singleton worker instance, created lazily
let workerInstance: Worker | null = null;
let workerIdCounter = 0;
const pendingCallbacks = new Map<number, { resolve: (k: RSAKeyPair) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new CryptoWorker();
    workerInstance.onmessage = (ev) => {
      const { id, result, error } = ev.data;
      const cb = pendingCallbacks.get(id);
      if (!cb) return;
      pendingCallbacks.delete(id);
      if (error) {
        cb.reject(new Error(error));
      } else {
        cb.resolve({
          p: BigInt(result.p), q: BigInt(result.q), n: BigInt(result.n),
          e: BigInt(result.e), d: BigInt(result.d), phi: BigInt(result.phi),
          dp: BigInt(result.dp), dq: BigInt(result.dq), qinv: BigInt(result.qinv),
        });
      }
    };
  }
  return workerInstance;
}

function rsaKeygenAsync(bits: number, e: bigint): Promise<RSAKeyPair> {
  return new Promise((resolve, reject) => {
    const id = ++workerIdCounter;
    pendingCallbacks.set(id, { resolve, reject });
    getWorker().postMessage({ id, type: 'rsa-keygen', bits, e: e.toString() });
  });
}


export function RSACalculator() {
  const [bitSize, setBitSize] = useState('64');
  const [eStr, setEStr] = useState('65537');
  const [keys, setKeys] = useState<RSAKeyPair | null>(null);
  const [genError, setGenError] = useState('');
  const [generating, setGenerating] = useState(false);
  const genIdRef = useRef(0); // stale-response guard

  // Manual mode — separate e so Generate and Manual don't cross-contaminate
  const [manP, setManP] = useState('');
  const [manQ, setManQ] = useState('');
  const [manEStr, setManEStr] = useState('65537');
  const [manKeys, setManKeys] = useState<RSAKeyPair | null>(null);
  const [manError, setManError] = useState('');

  // Cleanup worker on unmount
  useEffect(() => () => { workerInstance?.terminate(); workerInstance = null; }, []);

  // Encrypt / Decrypt
  const [encMsg, setEncMsg] = useState('');
  const [encE, setEncE] = useState('');
  const [encN, setEncN] = useState('');
  const [encResult, setEncResult] = useState('');

  const [decMsg, setDecMsg] = useState('');
  const [decD, setDecD] = useState('');
  const [decN, setDecN] = useState('');
  const [decResult, setDecResult] = useState('');

  async function doGenerate() {
    setGenError('');
    const bits = parseInt(bitSize);
    const e = parseBigInt(eStr);
    if (!bits || bits < 16 || bits > 2048) { setGenError('Bit size must be 16-2048'); return; }
    if (!e || e < 3n) { setGenError('e must be >= 3'); return; }
    setGenerating(true);
    const thisId = ++genIdRef.current;
    try {
      const k = await rsaKeygenAsync(bits, e);
      if (genIdRef.current !== thisId) return; // stale response
      setKeys(k);
      setEncE(k.e.toString());
      setEncN(k.n.toString());
      setDecD(k.d.toString());
      setDecN(k.n.toString());
    } catch (err) {
      if (genIdRef.current !== thisId) return;
      setGenError(String(err));
    }
    setGenerating(false);
  }

  function doManualKeys() {
    setManError('');
    const p = parseBigInt(manP), q = parseBigInt(manQ), e = parseBigInt(manEStr);
    if (!p || !q || !e) { setManError('Enter p, q, and e'); return; }
    if (!isPrime(p)) { setManError('p is not prime'); return; }
    if (!isPrime(q)) { setManError('q is not prime'); return; }
    if (p === q) { setManError('p and q must be different'); return; }
    try {
      const n = p * q;
      const phi = (p - 1n) * (q - 1n);
      if (gcd(e, phi) !== 1n) { setManError('gcd(e, φ(n)) ≠ 1'); return; }
      const d = modInverse(e, phi);
      const dp = mod(d, p - 1n);
      const dq = mod(d, q - 1n);
      const qinv = modInverse(q, p);
      const k: RSAKeyPair = { p, q, n, e, d, phi, dp, dq, qinv };
      setManKeys(k);
      setEncE(k.e.toString());
      setEncN(k.n.toString());
      setDecD(k.d.toString());
      setDecN(k.n.toString());
    } catch (err) {
      setManError(String(err));
    }
  }

  function doEncrypt() {
    const m = parseBigInt(encMsg), e = parseBigInt(encE), n = parseBigInt(encN);
    if (m === null || !e || !n) return;
    if (m >= n) { setEncResult(`Error: message m (${m}) must be < n (${n})`); return; }
    setEncResult(rsaEncrypt(m, e, n).toString());
  }

  function doDecrypt() {
    const c = parseBigInt(decMsg), d = parseBigInt(decD), n = parseBigInt(decN);
    if (c === null || !d || !n) return;
    setDecResult(rsaDecrypt(c, d, n).toString());
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function KeyDisplay({ k, label }: { k: RSAKeyPair; label: string }) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
        <Badge>{label}</Badge>
        <div className="grid grid-cols-1 gap-2 text-sm font-mono">
          {([
            ['p', k.p], ['q', k.q], ['n = p × q', k.n], ['φ(n)', k.phi],
            ['e', k.e], ['d', k.d], ['dp', k.dp], ['dq', k.dq], ['qinv', k.qinv],
          ] as [string, bigint][]).map(([label, val]) => (
            <div key={label} className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[80px] shrink-0">{label}:</span>
              <span
                className="break-all cursor-pointer hover:text-primary transition-colors"
                onClick={() => copyToClipboard(val.toString())}
                title="Click to copy"
              >
                {val.toString().length > 100
                  ? val.toString().slice(0, 50) + '...' + val.toString().slice(-50)
                  : val.toString()}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Click any value to copy to clipboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">How RSA works</p>
        <p className="text-muted-foreground">
          RSA is built on one simple idea: multiplying two large primes is easy, but factoring the result back into
          those primes is computationally infeasible. You pick two secret primes <strong>p</strong> and <strong>q</strong>,
          multiply them to get <strong>n = p x q</strong>, then derive a public exponent <strong>e</strong> and a
          private exponent <strong>d</strong> such that m<sup>ed</sup> mod n = m for any message m.
        </p>
        <p className="text-muted-foreground">
          Anyone can encrypt with (e, n), but only someone who knows d — which requires knowing p and q — can decrypt.
          The public key is (e, n). The private key is (d, n). Everything else (p, q, phi) must be destroyed after key generation.
        </p>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold text-foreground">Key generation step by step</summary>
          <ol className="list-decimal ml-4 mt-2 space-y-1">
            <li>Choose two distinct primes p and q (randomly, using a primality test)</li>
            <li>Compute n = p x q (the modulus — part of both public and private key)</li>
            <li>Compute phi(n) = (p-1)(q-1) (Euler's totient — counts integers coprime to n)</li>
            <li>Choose e such that 1 &lt; e &lt; phi(n) and gcd(e, phi(n)) = 1 (commonly 65537)</li>
            <li>Compute d = e<sup>-1</sup> mod phi(n) (the modular inverse — the private exponent)</li>
            <li>Public key: (e, n). Private key: (d, n). Discard p, q, phi(n).</li>
          </ol>
        </details>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="w-full flex">
          <TabsTrigger value="generate">Generate Keys</TabsTrigger>
          <TabsTrigger value="encrypt">Encrypt / Decrypt</TabsTrigger>
          <TabsTrigger value="manual">Manual Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RSA Key Generation</CardTitle>
              <CardDescription>Generate random RSA key pairs. Try small keys (64-bit) to see the math, then larger keys to feel the computation time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bits">Key Size (bits)</Label>
                  <Input id="bits" value={bitSize} onChange={e => setBitSize(e.target.value)} placeholder="64" className="font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">16-2048 bits (larger = slower)</p>
                </div>
                <div>
                  <Label htmlFor="rsa-e">Public Exponent (e)</Label>
                  <Input id="rsa-e" value={eStr} onChange={e => setEStr(e.target.value)} placeholder="65537" className="font-mono" />
                </div>
              </div>
              <Button onClick={doGenerate} disabled={generating} className="w-full">
                {generating ? 'Generating...' : 'Generate RSA Key Pair'}
              </Button>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-semibold">Primality test caveat</p>
                <p>
                  Primes are selected with a Miller–Rabin test: <strong>deterministic for
                  n &lt; 3.3 × 10²⁴</strong> (~81 bits) using the fixed witness set
                  {'{'}2, 3, …, 37{'}'} (Sorenson & Webster 2015). For larger n, the same 12 fixed witnesses
                  are tested first, then 8 additional random witnesses drawn via <code>crypto.getRandomValues</code> (20
                  rounds total, error ≤ 4⁻²⁰). This is adequate for educational use but not production —
                  real RSA implementations use ≥40 rounds or FIPS 186-5 probabilistic tests.
                </p>
              </div>
              {genError && <p className="text-sm text-destructive">{genError}</p>}
              {keys && <KeyDisplay k={keys} label="Generated Key Pair" />}
              {keys && (
                <WebCryptoVerify
                  label="Generate & test RSA with Web Crypto (constant-time)"
                  onVerify={async () => {
                    const r = await webCryptoRSAEncryptDecrypt(42n, 2048);
                    if (!r) return { success: false, details: ['Web Crypto RSA not available'] };
                    const decHex = bytesToHex(r.decrypted);
                    return {
                      success: decHex === '2a', // 42 = 0x2a
                      details: [
                        `Engine: ${r.engine}`,
                        `Key size: 2048-bit (Web Crypto minimum)`,
                        `Encrypted (first 32 bytes): ${bytesToHex(r.encrypted).substring(0, 64)}...`,
                        `Decrypted: 0x${decHex} (= ${parseInt(decHex, 16)})`,
                        `Your BigInt key: ${keys.n.toString().substring(0, 20)}... (${bitSize}-bit)`,
                      ],
                    };
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encrypt">
          <p className="text-xs text-muted-foreground mb-3">
            <strong>Encryption:</strong> raise the message to the public exponent e, mod n. <strong>Decryption:</strong> raise the ciphertext to the private exponent d, mod n.
            This works because e and d are modular inverses mod phi(n), so m<sup>ed</sup> mod n = m (by Euler's theorem).
            The message m must be smaller than n — in practice, you encrypt a symmetric key (e.g., AES), not raw data.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Encrypt</CardTitle>
                <CardDescription>c = m<sup>e</sup> mod n — anyone with the public key can do this</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Message (m) as integer</Label>
                  <Input value={encMsg} onChange={e => setEncMsg(e.target.value)} className="font-mono" placeholder="42" />
                </div>
                <div>
                  <Label>Public exponent (e)</Label>
                  <Input value={encE} onChange={e => setEncE(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label>Modulus (n)</Label>
                  <Input value={encN} onChange={e => setEncN(e.target.value)} className="font-mono" />
                </div>
                <Button onClick={doEncrypt} className="w-full">Encrypt</Button>
                {encResult && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <Label className="text-xs text-muted-foreground">Ciphertext (c)</Label>
                    <p className="font-mono break-all text-sm">{encResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Decrypt</CardTitle>
                <CardDescription>m = c<sup>d</sup> mod n — only the private key holder can do this</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Ciphertext (c)</Label>
                  <Input value={decMsg} onChange={e => setDecMsg(e.target.value)} className="font-mono" placeholder="..." />
                </div>
                <div>
                  <Label>Private exponent (d)</Label>
                  <Input value={decD} onChange={e => setDecD(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label>Modulus (n)</Label>
                  <Input value={decN} onChange={e => setDecN(e.target.value)} className="font-mono" />
                </div>
                <Button onClick={doDecrypt} className="w-full">Decrypt</Button>
                {decResult && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <Label className="text-xs text-muted-foreground">Plaintext (m)</Label>
                    <p className="font-mono break-all text-sm">{decResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Key Computation</CardTitle>
              <CardDescription>Enter your own primes to trace every step. Try p=61, q=53 to match textbook examples. The tool computes n, phi(n), d, and the CRT optimization values (dp, dq, qinv) automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Prime p</Label>
                  <Input value={manP} onChange={e => setManP(e.target.value)} className="font-mono" placeholder="61" />
                </div>
                <div>
                  <Label>Prime q</Label>
                  <Input value={manQ} onChange={e => setManQ(e.target.value)} className="font-mono" placeholder="53" />
                </div>
                <div>
                  <Label>Public exponent (e)</Label>
                  <Input value={manEStr} onChange={e => setManEStr(e.target.value)} className="font-mono" placeholder="65537" />
                </div>
              </div>
              <Button onClick={doManualKeys} className="w-full">Compute Key Pair</Button>
              {manError && <p className="text-sm text-destructive">{manError}</p>}
              {manKeys && <KeyDisplay k={manKeys} label="Computed Key Pair" />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
