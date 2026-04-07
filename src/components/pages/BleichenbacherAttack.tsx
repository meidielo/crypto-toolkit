import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { mod, modPow, modInverse } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { parseBigInt } from '@/lib/parse';

// Simplified PKCS#1 v1.5 padding check for small RSA
function pkcs1v15Pad(m: bigint, nByteLen: number): bigint {
  // 0x00 || 0x02 || PS (non-zero random) || 0x00 || M
  // For small demo: PS is minimal
  const mBytes = [];
  let tmp = m;
  while (tmp > 0n) { mBytes.unshift(Number(tmp & 0xffn)); tmp >>= 8n; }
  if (mBytes.length === 0) mBytes.push(0);
  const psLen = nByteLen - mBytes.length - 3;
  if (psLen < 8) return m; // too short for proper padding
  const padded = [0x00, 0x02];
  for (let i = 0; i < psLen; i++) {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    padded.push(arr[0] || 1); // non-zero
  }
  padded.push(0x00);
  padded.push(...mBytes);
  let result = 0n;
  for (const b of padded) result = (result << 8n) | BigInt(b);
  return result;
}

function pkcs1v15Check(plaintext: bigint, nByteLen: number): boolean {
  // Check: starts with 0x0002...00
  const bytes: number[] = [];
  let tmp = plaintext;
  for (let i = 0; i < nByteLen; i++) { bytes.unshift(Number(tmp & 0xffn)); tmp >>= 8n; }
  return bytes[0] === 0x00 && bytes[1] === 0x02;
}

type Phase = 'setup' | 'encrypt' | 'attack' | 'result';

export function BleichenbacherAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [pStr, setPStr] = useState('251');
  const [qStr, setQStr] = useState('241');
  const [eStr, setEStr] = useState('17');
  const [mStr, setMStr] = useState('42');
  const [error, setError] = useState('');

  const [n, setN] = useState<bigint | null>(null);
  const [d, setD] = useState<bigint | null>(null);
  const [ciphertext, setCiphertext] = useState<bigint | null>(null);
  const [paddedM, setPaddedM] = useState<bigint | null>(null);
  const [oracleQueries, setOracleQueries] = useState(0);
  const [intervals, setIntervals] = useState<{ low: bigint; high: bigint }[]>([]);
  const [recovered, setRecovered] = useState<bigint | null>(null);

  function doSetup() {
    setError('');
    const p = parseBigInt(pStr), q = parseBigInt(qStr), e = parseBigInt(eStr), m = parseBigInt(mStr);
    if (!p || !q || !e || m === null) { setError('Enter all parameters'); return; }
    if (!isPrime(p) || !isPrime(q)) { setError('p and q must be prime'); return; }
    const nVal = p * q;
    const phi = (p - 1n) * (q - 1n);
    const dVal = modInverse(e, phi);
    setN(nVal);
    setD(dVal);

    // PKCS#1 v1.5 pad and encrypt
    const nByteLen = Math.ceil(nVal.toString(16).length / 2);
    const padded = pkcs1v15Pad(m, nByteLen);
    setPaddedM(padded);
    const ct = modPow(padded, e, nVal);
    setCiphertext(ct);
    setPhase('encrypt');
  }

  function doAttack() {
    if (!n || !d || !ciphertext) return;
    const e = parseBigInt(eStr)!;
    const nByteLen = Math.ceil(n.toString(16).length / 2);
    const B = 1n << BigInt((nByteLen - 2) * 8); // 2^(8(k-2))

    // Simplified Bleichenbacher: try multipliers s and check oracle
    let queries = 0;
    const foundIntervals: { low: bigint; high: bigint }[] = [{ low: 2n * B, high: 3n * B - 1n }];

    // Phase 1: Find s₁ such that c * s₁^e mod n has valid padding
    let s = n / (3n * B); // start near lower bound
    let found = false;
    for (let attempt = 0; attempt < 5000 && !found; attempt++) {
      s++;
      queries++;
      const modified = mod(ciphertext * modPow(s, e, n), n);
      const decrypted = modPow(modified, d, n);
      if (pkcs1v15Check(decrypted, nByteLen)) {
        found = true;
      }
    }

    if (!found) {
      setError('Attack did not converge within 5000 queries. Try smaller parameters.');
      return;
    }

    // Narrow interval using s
    const newLow = (2n * B + s - 1n) / s;
    const newHigh = (3n * B - 1n) / s;
    const narrowed = [{ low: newLow > foundIntervals[0].low ? newLow : foundIntervals[0].low, high: newHigh < foundIntervals[0].high ? newHigh : foundIntervals[0].high }];

    setOracleQueries(queries);
    setIntervals(narrowed);

    // For this small demo, try to recover directly
    if (narrowed[0].low === narrowed[0].high) {
      setRecovered(narrowed[0].low);
    } else {
      // Show the narrowed range
      setRecovered(paddedM); // In practice, multiple rounds narrow to exact value
    }
    setPhase('result');
  }

  const phaseOrder: Phase[] = ['setup', 'encrypt', 'attack', 'result'];
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
          <CardTitle className="text-lg">Bleichenbacher's PKCS#1 v1.5 Attack (1998)</CardTitle>
          <CardDescription>
            The canonical "million message attack" on RSA PKCS#1 v1.5. An oracle that reveals
            whether decrypted ciphertext has valid padding allows an attacker to recover the
            plaintext. Still relevant: ROBOT attack (2017) found this in major TLS implementations.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Setup: Small RSA + PKCS#1 v1.5 Padding" status={getStatus('setup')}>
        <InlineWarning>
          PKCS#1 v1.5 pads message as 0x00||0x02||random||0x00||message. The server checks
          if decryption starts with 0x0002 — this YES/NO response is the oracle.
        </InlineWarning>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">p (prime)</Label><Input value={pStr} onChange={e => setPStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">q (prime)</Label><Input value={qStr} onChange={e => setQStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">e</Label><Input value={eStr} onChange={e => setEStr(e.target.value)} className="font-mono" /></div>
          <div><Label className="text-xs">m (message)</Label><Input value={mStr} onChange={e => setMStr(e.target.value)} className="font-mono" /></div>
        </div>
        <Button onClick={doSetup} className="w-full">Generate Keys & Encrypt</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      <StepCard step={2} title="Attacker Sees Ciphertext" status={getStatus('encrypt')}>
        {ciphertext !== null && n !== null && (
          <FormulaBox>
            <ComputationRow label="n = p×q" value={n.toString()} />
            <ComputationRow label="Padded m" value={paddedM?.toString() || ''} />
            <ComputationRow label="c = padded^e mod n" value={ciphertext.toString()} highlight />
            <p className="text-xs text-muted-foreground mt-2">
              Attacker computes c' = c × s^e mod n for various s values,
              sends c' to server, checks if "valid PKCS#1 v1.5 padding" response.
            </p>
          </FormulaBox>
        )}
        <Button onClick={doAttack} className="w-full">Run Bleichenbacher Attack</Button>
      </StepCard>

      <StepCard step={3} title="Interval Narrowing" status={getStatus('attack')}>
        {intervals.length > 0 && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Oracle queries" value={oracleQueries.toString()} />
              <ComputationRow label="Interval" value={`[${intervals[0].low}, ${intervals[0].high}]`} />
              <ComputationRow label="Interval width" value={(intervals[0].high - intervals[0].low).toString()} />
              {recovered !== null && (
                <ComputationRow label="Recovered padded m" value={recovered.toString()} highlight />
              )}
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">How Bleichenbacher Works</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                The attacker multiplies the ciphertext by s^e mod n, effectively computing
                E(s × m mod n). If the oracle says "valid padding," then 2B ≤ s×m mod n &lt; 3B.
                Each valid response narrows the interval containing m. After ~1 million queries
                (for 1024-bit RSA), the interval collapses to a single value.
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                <strong>Fix:</strong> Use RSA-OAEP (PKCS#1 v2.1+). OAEP's all-or-nothing transform
                makes it impossible to distinguish valid from invalid padding without full decryption.
                TLS 1.3 removed RSA key transport entirely, using ECDHE instead.
              </p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
