import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  generateRSAKeys,
  rsaEncrypt,
  rsaDecrypt,
  isPrime,
  gcd,
  modInverse,
  mod,
  type RSAKeyPair,
} from '@/lib/crypto-math';

function parseBigInt(s: string): bigint | null {
  try {
    const t = s.trim();
    if (!t) return null;
    return BigInt(t);
  } catch {
    return null;
  }
}

export function RSACalculator() {
  const [bitSize, setBitSize] = useState('64');
  const [eStr, setEStr] = useState('65537');
  const [keys, setKeys] = useState<RSAKeyPair | null>(null);
  const [genError, setGenError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Manual mode
  const [manP, setManP] = useState('');
  const [manQ, setManQ] = useState('');
  const [manKeys, setManKeys] = useState<RSAKeyPair | null>(null);
  const [manError, setManError] = useState('');

  // Encrypt / Decrypt
  const [encMsg, setEncMsg] = useState('');
  const [encE, setEncE] = useState('');
  const [encN, setEncN] = useState('');
  const [encResult, setEncResult] = useState('');

  const [decMsg, setDecMsg] = useState('');
  const [decD, setDecD] = useState('');
  const [decN, setDecN] = useState('');
  const [decResult, setDecResult] = useState('');

  function doGenerate() {
    setGenError('');
    const bits = parseInt(bitSize);
    const e = parseBigInt(eStr);
    if (!bits || bits < 16 || bits > 2048) { setGenError('Bit size must be 16-2048'); return; }
    if (!e || e < 3n) { setGenError('e must be >= 3'); return; }
    setGenerating(true);
    setTimeout(() => {
      try {
        const k = generateRSAKeys(bits, e);
        setKeys(k);
        setEncE(k.e.toString());
        setEncN(k.n.toString());
        setDecD(k.d.toString());
        setDecN(k.n.toString());
      } catch (err) {
        setGenError(String(err));
      }
      setGenerating(false);
    }, 10);
  }

  function doManualKeys() {
    setManError('');
    const p = parseBigInt(manP), q = parseBigInt(manQ), e = parseBigInt(eStr);
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
    if (!m || !e || !n) return;
    setEncResult(rsaEncrypt(m, e, n).toString());
  }

  function doDecrypt() {
    const c = parseBigInt(decMsg), d = parseBigInt(decD), n = parseBigInt(decN);
    if (!c || !d || !n) return;
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
      <Tabs defaultValue="generate">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="generate">Generate Keys</TabsTrigger>
          <TabsTrigger value="encrypt">Encrypt / Decrypt</TabsTrigger>
          <TabsTrigger value="manual">Manual Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RSA Key Generation</CardTitle>
              <CardDescription>Generate random RSA key pairs for educational purposes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              {genError && <p className="text-sm text-destructive">{genError}</p>}
              {keys && <KeyDisplay k={keys} label="Generated Key Pair" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encrypt">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Encrypt</CardTitle>
                <CardDescription>c = m^e mod n</CardDescription>
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
                <CardDescription>m = c^d mod n</CardDescription>
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
              <CardDescription>Enter your own primes p and q to compute the full key pair</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prime p</Label>
                  <Input value={manP} onChange={e => setManP(e.target.value)} className="font-mono" placeholder="61" />
                </div>
                <div>
                  <Label>Prime q</Label>
                  <Input value={manQ} onChange={e => setManQ(e.target.value)} className="font-mono" placeholder="53" />
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
