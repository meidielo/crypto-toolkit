import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, ComputationRow, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { modPow, modInverse } from '@/lib/ec-math';
import { isPrime } from '@/lib/crypto-math';
import { parseBigInt } from '@/lib/parse';
import { randBytes } from '@/lib/num-util';
import { runBleichenbacher, type Interval } from '@/lib/bleichenbacher';

// PKCS#1 v1.5 padding for the demo. We do NOT enforce the real PS ≥ 8 rule
// because the toy RSA moduli needed to keep the attack inside a browser
// query budget are too small to fit 8 bytes of padding. The Bleichenbacher
// oracle only checks the 00 02 prefix, so this relaxation does not change
// the attack's pedagogy — it still recovers the exact same plaintext.
function pkcs1v15Pad(m: bigint, nByteLen: number): bigint {
  const mBytes: number[] = [];
  let tmp = m;
  while (tmp > 0n) { mBytes.unshift(Number(tmp & 0xffn)); tmp >>= 8n; }
  if (mBytes.length === 0) mBytes.push(0);
  const psLen = nByteLen - mBytes.length - 3;
  if (psLen < 0) throw new Error('Message too large for modulus');
  const padded: number[] = [0x00, 0x02];
  if (psLen > 0) {
    // One CSPRNG draw for PS; ensure every byte is non-zero per PKCS#1 v1.5.
    const psRandom = randBytes(psLen);
    for (let i = 0; i < psLen; i++) padded.push(psRandom[i] || 1);
  }
  padded.push(0x00);
  padded.push(...mBytes);
  let result = 0n;
  for (const b of padded) result = (result << 8n) | BigInt(b);
  return result;
}

function pkcs1v15Check(plaintext: bigint, nByteLen: number): boolean {
  const bytes: number[] = [];
  let tmp = plaintext;
  for (let i = 0; i < nByteLen; i++) { bytes.unshift(Number(tmp & 0xffn)); tmp >>= 8n; }
  return bytes[0] === 0x00 && bytes[1] === 0x02;
}

type Phase = 'setup' | 'encrypt' | 'attack' | 'result';

export function BleichenbacherAttack() {
  const [phase, setPhase] = useState<Phase>('setup');
  // Defaults sized so the attack converges in < 2M queries and the modulus
  // leaves ≥ 2 bytes for padding + message. p, q ≈ 2^16; n ≈ 2^32 (k=4).
  const [pStr, setPStr] = useState('65521');
  const [qStr, setQStr] = useState('65519');
  const [eStr, setEStr] = useState('11');
  const [mStr, setMStr] = useState('42');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const [n, setN] = useState<bigint | null>(null);
  const [ciphertext, setCiphertext] = useState<bigint | null>(null);
  const [paddedM, setPaddedM] = useState<bigint | null>(null);
  const [oracleQueries, setOracleQueries] = useState(0);
  const [iterations, setIterations] = useState(0);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [recovered, setRecovered] = useState<bigint | null>(null);
  const [hitBudget, setHitBudget] = useState(false);

  function doSetup() {
    setError('');
    const p = parseBigInt(pStr), q = parseBigInt(qStr), e = parseBigInt(eStr), m = parseBigInt(mStr);
    if (p === null || q === null || e === null || m === null) { setError('Enter all parameters'); return; }
    if (!isPrime(p) || !isPrime(q)) { setError('p and q must be prime'); return; }
    if (p === q) { setError('p and q must differ'); return; }
    const nVal = p * q;
    const phi = (p - 1n) * (q - 1n);
    let dVal: bigint;
    try { dVal = modInverse(e, phi); }
    catch { setError('e is not coprime to φ(n)'); return; }
    setN(nVal);

    const nByteLen = Math.ceil(nVal.toString(16).length / 2);
    if (nByteLen < 3) { setError(`Modulus too small (k=${nByteLen}) — need at least 3 bytes`); return; }
    let padded: bigint;
    try { padded = pkcs1v15Pad(m, nByteLen); }
    catch (err) { setError(String(err)); return; }
    // Precondition: the padded integer must live in [2B, 3B) — i.e. start 00 02.
    setPaddedM(padded);
    // Sanity-check: dVal is used below only transitively through the oracle,
    // so verify the keypair works on the padded plaintext before the attack.
    const ct = modPow(padded, e, nVal);
    if (modPow(ct, dVal, nVal) !== padded) { setError('Keypair verification failed'); return; }
    setCiphertext(ct);
    setPhase('encrypt');
    setRecovered(null);
    setIntervals([]);
    setOracleQueries(0);
    setIterations(0);
    setHitBudget(false);
  }

  function doAttack() {
    if (!n || !ciphertext) return;
    const e = parseBigInt(eStr)!;
    // The attacker needs the oracle but NOT d — we simulate the oracle by
    // computing d locally (as any chosen-ciphertext adversary observing the
    // server's padding-error side channel would indirectly). This is the
    // "server" side of the attack; the attacker's code in runBleichenbacher
    // only sees true/false responses.
    const p = parseBigInt(pStr)!, q = parseBigInt(qStr)!;
    const phi = (p - 1n) * (q - 1n);
    const dOracle = modInverse(e, phi);
    const nByteLen = Math.ceil(n.toString(16).length / 2);

    const oracle = (x: bigint): boolean => {
      const plain = modPow(x, dOracle, n);
      return pkcs1v15Check(plain, nByteLen);
    };

    setRunning(true);
    setError('');
    // Yield to the browser so the "Running…" state renders before the
    // synchronous attack kicks off. For these toy parameters the attack
    // finishes in ≲ 2 seconds; no need for a Web Worker.
    setTimeout(() => {
      try {
        const result = runBleichenbacher({
          n, e, c: ciphertext, k: nByteLen, oracle,
          queryBudget: 2_000_000,
          iterationBudget: 5_000,
        });
        setOracleQueries(result.queries);
        setIterations(result.iterations);
        setIntervals(result.finalIntervals);
        setRecovered(result.recovered);
        setHitBudget(result.hitBudget);
        if (result.hitBudget && result.recovered === null) {
          setError(`Attack exhausted budget after ${result.queries.toLocaleString()} queries. ` +
            `Final interval width: ${(result.finalIntervals[0]?.high - result.finalIntervals[0]?.low).toString()}. ` +
            `Try smaller primes.`);
        }
      } catch (err) {
        setError(`Attack failed: ${String(err)}`);
      } finally {
        setRunning(false);
        setPhase('result');
      }
    }, 20);
  }

  const getStatus = usePhaseStatus<Phase>(['setup', 'encrypt', 'attack', 'result'], phase);

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
          if decryption starts with 0x0002 — this YES/NO response is the oracle. Defaults
          use a 32-bit modulus so the attack finishes in a browser; production RSA is 2048+ bits.
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
        <Button onClick={doAttack} className="w-full" disabled={running || !ciphertext}>
          {running ? 'Running attack…' : 'Run Bleichenbacher Attack'}
        </Button>
        {running && (
          <p className="text-xs text-muted-foreground text-center">
            Iterating through steps 2a / 2b / 2c and narrowing — may take a few seconds for these parameters.
          </p>
        )}
      </StepCard>

      <StepCard step={3} title="Interval Narrowing" status={getStatus('attack')}>
        {intervals.length > 0 && (
          <div className="space-y-3">
            <FormulaBox>
              <ComputationRow label="Outer iterations" value={iterations.toString()} />
              <ComputationRow label="Oracle queries" value={oracleQueries.toLocaleString()} />
              <ComputationRow label="Final |M|" value={`${intervals.length} interval${intervals.length === 1 ? '' : 's'}`} />
              <ComputationRow label="Tightest interval" value={`[${intervals[0].low}, ${intervals[0].high}]`} />
              <ComputationRow label="Interval width" value={(intervals[0].high - intervals[0].low + 1n).toString()} />
              {recovered !== null && paddedM !== null && (
                <>
                  <ComputationRow label="Recovered padded m" value={recovered.toString()} highlight />
                  <ComputationRow
                    label="Matches original?"
                    value={recovered === paddedM ? 'YES — plaintext fully recovered' : 'NO — bug in attack or oracle'}
                    highlight={recovered === paddedM}
                  />
                </>
              )}
              {hitBudget && recovered === null && (
                <p className="text-xs text-amber-600 mt-2">
                  Budget exhausted before convergence. The final M is shown above — in a full run it would
                  continue narrowing across more iterations.
                </p>
              )}
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">How Bleichenbacher Works</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                The attacker multiplies the ciphertext by s^e mod n, effectively computing
                E(s × m mod n). If the oracle says "valid padding," then for some integer r:
                2B + r·n ≤ s·m ≤ 3B − 1 + r·n. Each valid response constrains m to a union
                of intervals M; the algorithm iterates Steps 2 (find next s) and 3 (narrow M)
                until |M| = {'{[a, a]}'}. Step 2c switches to a two-dimensional (r, s) search
                once M collapses to a single interval — this is what the real attack above runs,
                not a facade. For 1024-bit RSA the expected query count is ~10⁶.
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
