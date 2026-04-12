import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { aesECB, aesECBDecrypt, bytesToHexAES, hexToBytesAES } from '@/lib/aes-math';
import { randBytes } from '@/lib/num-util';

// PKCS#7 padding
function pkcs7Pad(data: number[], blockSize: number): number[] {
  const padLen = blockSize - (data.length % blockSize);
  return [...data, ...Array(padLen).fill(padLen)];
}

function pkcs7Valid(block: number[]): boolean {
  const padByte = block[block.length - 1];
  if (padByte < 1 || padByte > 16) return false;
  for (let i = block.length - padByte; i < block.length; i++) {
    if (block[i] !== padByte) return false;
  }
  return true;
}

// AES-CBC encrypt (educational — NOT authenticated)
function aesCBCEncrypt(plaintext: number[], key: number[], iv: number[]): number[][] {
  const padded = pkcs7Pad(plaintext, 16);
  const blocks: number[][] = [];
  let prev = iv;
  for (let i = 0; i < padded.length; i += 16) {
    const ptBlock = padded.slice(i, i + 16);
    const xored = ptBlock.map((b, j) => b ^ prev[j]);
    const ct = aesECB(xored, key);
    blocks.push(ct);
    prev = ct;
  }
  return blocks;
}

// The "padding oracle" — returns true if decrypted block has valid PKCS#7
// Real AES-CBC padding oracle: performs actual AES decryption using inverse cipher
// (InvSubBytes, InvShiftRows, InvMixColumns, AddRoundKey) then checks PKCS#7 padding.
function paddingOracle(cipherBlock: number[], prevBlock: number[], key: number[]): boolean {
  const decrypted = aesECBDecrypt(cipherBlock, key); // Real AES-128 inverse cipher
  return pkcs7Valid(decrypted.map((b, i) => b ^ prevBlock[i]));
}

type Phase = 'setup' | 'encrypt' | 'attack' | 'result';

export function PaddingOracleAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [keyHex, setKeyHex] = useState('000102030405060708090a0b0c0d0e0f');
  const [plaintext, setPlaintext] = useState('HELLO WORLD!');
  const [error, setError] = useState('');

  const [iv, setIv] = useState<number[]>([]);
  const [ctBlocks, setCtBlocks] = useState<number[][]>([]);
  const [oracleQueries, setOracleQueries] = useState(0);
  const [recoveredBytes, setRecoveredBytes] = useState<number[]>([]);
  const [attacking, setAttacking] = useState(false);

  function doEncrypt() {
    setError('');
    try {
      const key = hexToBytesAES(keyHex);
      if (key.length !== 16) { setError('Key must be 16 bytes'); return; }
      const ptBytes = Array.from(new TextEncoder().encode(plaintext));
      const ivBytes = Array.from(randBytes(16));
      const blocks = aesCBCEncrypt(ptBytes, key, ivBytes);
      setIv(ivBytes);
      setCtBlocks(blocks);
      setPhase('encrypt');
    } catch (e) { setError(String(e)); }
  }

  function doAttack() {
    setAttacking(true);
    setRecoveredBytes([]);
    setOracleQueries(0);

    const key = hexToBytesAES(keyHex);
    let queries = 0;
    const allRecovered: number[] = [];

    // Attack every block, from first to last. For block i, the "previous"
    // ciphertext block is ctBlocks[i-1] (or the IV for block 0).
    for (let blockIdx = 0; blockIdx < ctBlocks.length; blockIdx++) {
      const targetBlock = ctBlocks[blockIdx];
      const prevBlock = blockIdx > 0 ? ctBlocks[blockIdx - 1] : iv;
      const recovered: number[] = new Array(16).fill(0);

      // Recover bytes from position 15 down to 0
      for (let pos = 15; pos >= 0; pos--) {
        const padVal = 16 - pos;
        const tampered = [...prevBlock];
        for (let j = pos + 1; j < 16; j++) {
          tampered[j] = prevBlock[j] ^ recovered[j] ^ padVal;
        }

        let found = false;
        for (let guess = 0; guess < 256; guess++) {
          queries++;
          tampered[pos] = prevBlock[pos] ^ guess ^ padVal;
          if (paddingOracle(targetBlock, tampered, key)) {
            recovered[pos] = guess;
            found = true;
            break;
          }
        }
        if (!found) recovered[pos] = 0;
      }
      allRecovered.push(...recovered);
    }

    setRecoveredBytes(allRecovered);
    setOracleQueries(queries);
    setAttacking(false);
    setPhase('result');
  }

  const getStatus = usePhaseStatus<Phase>(['setup', 'encrypt', 'attack', 'result'], phase);

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Padding Oracle Attack (AES-CBC)</CardTitle>
          <CardDescription>
            Demonstrates why AES-CBC without authentication is broken. An attacker who can query
            a "padding oracle" (valid/invalid padding response) can decrypt any ciphertext
            without knowing the key. This is the Vaudenay attack (2002).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">AES-CBC encrypts data but does not authenticate it. If a server tells an attacker whether decrypted data has valid padding (even just via a different error message or timing), the attacker can decrypt the entire ciphertext without the key.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">In CBC mode, flipping a byte in ciphertext block C<sub>i-1</sub> flips the corresponding byte in the decrypted block P<sub>i</sub>. The attacker tries all 256 values for one byte and asks the oracle "is the padding valid?" A "yes" reveals the plaintext byte via XOR. Repeat 16 times per block to recover everything.</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Step by step</summary>
          <ol className="mt-2 text-xs text-muted-foreground list-decimal list-inside space-y-1">
            <li><strong>Encrypt</strong> — AES-CBC with PKCS#7 padding produces ciphertext blocks.</li>
            <li><strong>Target the last byte</strong> — tamper with the previous block's last byte, cycling through 0-255.</li>
            <li><strong>Query the oracle</strong> — the server decrypts and reports valid/invalid padding.</li>
            <li><strong>Recover one byte</strong> — when padding is valid, XOR reveals the plaintext byte.</li>
            <li><strong>Repeat</strong> — adjust the target padding value (0x02, 0x03, ...) and work backwards through each byte.</li>
          </ol>
        </details>
      </div>

      <StepCard step={1} title="Encrypt with AES-CBC (no authentication)" status={getStatus('setup')}>
        <p className="text-xs text-muted-foreground">We encrypt a plaintext with AES-128-CBC and PKCS#7 padding. In a real scenario, the attacker intercepts this ciphertext from the network. The key stays on the server -- the attacker never sees it.</p>
        <InlineWarning>
          AES-CBC encrypts data but does NOT authenticate it. An attacker can modify ciphertext and observe
          whether the server reports "invalid padding" — this response IS the oracle.
        </InlineWarning>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Key (32 hex = 16 bytes)</Label><Input value={keyHex} onChange={e => setKeyHex(e.target.value)} className="font-mono text-xs" /></div>
          <div><Label className="text-xs">Plaintext</Label><Input value={plaintext} onChange={e => setPlaintext(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doEncrypt} className="w-full">Encrypt (AES-CBC + PKCS#7 Padding)</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Ciphertext (attacker sees this)" status={getStatus('encrypt')}>
        <p className="text-xs text-muted-foreground">The attacker has the IV and ciphertext blocks. They will systematically modify bytes in the previous block and observe whether the server accepts or rejects the padding after decryption.</p>
        {ctBlocks.length > 0 && (
          <FormulaBox>
            <ComputationRow label="IV" value={bytesToHexAES(iv)} />
            {ctBlocks.map((block, i) => (
              <ComputationRow key={i} label={`Block ${i}`} value={bytesToHexAES(block)} />
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              The attacker has the IV and ciphertext but NOT the key. They can modify bytes and
              send them to the server, which responds with "valid" or "invalid padding."
            </p>
          </FormulaBox>
        )}
        <Button onClick={doAttack} disabled={attacking} className="w-full">
          {attacking ? 'Running Oracle Attack...' : 'Launch Padding Oracle Attack'}
        </Button>
      </StepCard>

      <StepCard step={3} title="Attack Result" status={getStatus('attack')}>
        {recoveredBytes.length > 0 && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Oracle queries" value={oracleQueries.toString()} />
              <ComputationRow label="Recovered (hex)" value={bytesToHexAES(recoveredBytes)} highlight />
              <ComputationRow label="Recovered (text)" value={recoveredBytes.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('')} highlight />
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Why This Works</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                PKCS#7 padding is deterministic: the last byte tells how many padding bytes exist.
                By flipping one byte in the previous ciphertext block, the attacker changes the
                corresponding decrypted byte. They try all 256 values until the server says "valid padding" —
                revealing the plaintext byte via XOR. Repeat for all 16 bytes = full block recovered.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Use authenticated encryption (AES-GCM). The authentication tag
                detects ANY ciphertext modification, eliminating the oracle entirely.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Timing note:</strong> In this demo the oracle returns instantly. In real attacks,
                the timing difference between "invalid padding" and "valid padding but wrong MAC" is
                microseconds — enough for a network attacker to distinguish. Some oracles leak via
                distinct error messages, HTTP status codes, or connection resets rather than timing.
              </p>
            </div>
          </div>
        )}
      </StepCard>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">Limitations & real-world context</p>
        <p>This demo runs the oracle locally and instantly. Real attacks like POODLE (2014, SSLv3) and Lucky13 (2013, TLS) exploited padding oracles over the network, requiring thousands of requests per byte and careful timing analysis.</p>
        <p>The fix is authenticated encryption (AES-GCM, ChaCha20-Poly1305). The authentication tag is checked before decryption, so a tampered ciphertext is rejected immediately with no padding information leaked.</p>
        <p>Even "constant-time" CBC implementations can leak via micro-architectural side channels (cache timing, branch prediction). This is why modern TLS versions have moved away from CBC entirely.</p>
      </div>
    </div>
  );
}
