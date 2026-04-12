import { useState } from 'react';
import { usePhaseStatus } from '@/hooks/usePhaseStatus';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepCard, FormulaBox } from '@/components/StepCard';
import { StateMatrix } from '@/components/StateMatrix';
import { ShiftRowsAnimation } from '@/components/ShiftRowsAnimation';
import { WebCryptoVerify } from '@/components/WebCryptoVerify';
import { webCryptoAESEncrypt, bytesToHex } from '@/lib/web-crypto';
import {
  hexToState,
  stateToHex,
  subBytes,
  shiftRows,
  mixColumns,
  addRoundKey,
  keyExpansion,
  mixColumnDetail,
  MIX_MATRIX,
  SBOX,
  type State,
} from '@/lib/aes-math';

type Phase = 'input' | 'subbytes' | 'shiftrows' | 'mixcols' | 'addrk';

function diffHighlight(a: State, b: State): boolean[][] {
  return a.map((col, c) => col.map((v, r) => v !== b[c][r]));
}

export function AESWorkflow() {
  const [phase, setPhase] = useState<Phase>('input');
  const [ptHex, setPtHex] = useState('00112233445566778899aabbccddeeff');
  const [keyHex, setKeyHex] = useState('000102030405060708090a0b0c0d0e0f');
  const [error, setError] = useState('');

  const [initial, setInitial] = useState<State | null>(null);
  const [afterSub, setAfterSub] = useState<State | null>(null);
  const [afterShift, setAfterShift] = useState<State | null>(null);
  const [afterMix, setAfterMix] = useState<State | null>(null);
  const [roundKey, setRoundKey] = useState<State | null>(null);
  const [afterARK, setAfterARK] = useState<State | null>(null);
  const [selectedCol, setSelectedCol] = useState(0);

  function doSetup() {
    setError('');
    const cleanPt = ptHex.replace(/\s+/g, '');
    const cleanKey = keyHex.replace(/\s+/g, '');
    if (cleanPt.length !== 32 || !/^[0-9a-fA-F]+$/.test(cleanPt)) {
      setError('Plaintext must be exactly 16 bytes (32 hex chars)'); return;
    }
    if (cleanKey.length !== 32 || !/^[0-9a-fA-F]+$/.test(cleanKey)) {
      setError('Key must be exactly 16 bytes (32 hex chars)'); return;
    }
    try {
      const state = hexToState(cleanPt);
      const keyBytes = [];
      for (let i = 0; i < 32; i += 2) keyBytes.push(parseInt(cleanKey.substring(i, i + 2), 16));
      const roundKeys = keyExpansion(keyBytes);

      // Initial AddRoundKey (Round 0), then Round 1 operations
      const afterRound0 = addRoundKey(state, roundKeys[0]);
      setInitial(afterRound0);

      const sb = subBytes(afterRound0);
      setAfterSub(sb);

      const sr = shiftRows(sb);
      setAfterShift(sr);

      const mc = mixColumns(sr);
      setAfterMix(mc);

      setRoundKey(roundKeys[1]);
      const ark = addRoundKey(mc, roundKeys[1]);
      setAfterARK(ark);

      setPhase('subbytes');
    } catch (e) { setError(String(e)); }
  }

  const phaseOrder: Phase[] = ['input', 'subbytes', 'shiftrows', 'mixcols', 'addrk'];
  const getStatus = usePhaseStatus<Phase>(phaseOrder, phase);
  function advance() {
    const idx = phaseOrder.indexOf(phase);
    const next = phaseOrder[idx + 1];
    if (next) setPhase(next);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">AES-128 Single Round Visualization</CardTitle>
          <CardDescription>
            Step-by-step breakdown of one AES round: SubBytes, ShiftRows, MixColumns, AddRoundKey.
            Shows the 4x4 byte state matrix transformations with GF(2^8) arithmetic.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">You need to encrypt data so only the key holder can read it. The cipher must be fast in hardware and software, resist all known cryptanalytic attacks, and work on fixed-size blocks of data.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">AES (Rijndael) operates on a 4×4 matrix of bytes called the "state." Each round applies four transformations that together provide both confusion (SubBytes — nonlinear S-box substitution) and diffusion (ShiftRows + MixColumns — spreading each byte's influence across the entire state). After 10 rounds, every output bit depends on every input bit and every key bit.</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">The four round operations</summary>
          <ol className="mt-2 text-xs text-muted-foreground list-decimal list-inside space-y-1">
            <li><strong>SubBytes</strong> — each byte is replaced by its S-Box value (multiplicative inverse in GF(2⁸) + affine transform). This is the only nonlinear step — it defeats linear and differential cryptanalysis.</li>
            <li><strong>ShiftRows</strong> — rows of the state matrix are cyclically shifted left by 0, 1, 2, 3 positions. This ensures bytes from one column spread to different columns.</li>
            <li><strong>MixColumns</strong> — each column is multiplied by a fixed matrix in GF(2⁸). This provides diffusion within each column using polynomial multiplication mod x⁴+1.</li>
            <li><strong>AddRoundKey</strong> — XOR the state with the round key derived from the key schedule. This is where the secret key enters each round.</li>
          </ol>
        </details>
      </div>

      {/* Step 1: Input */}
      <StepCard step={1} title="Input: Plaintext & Key" status={getStatus('input')}>
        <p className="text-xs text-muted-foreground">AES-128 takes a 16-byte plaintext and a 16-byte key. Before any rounds, an initial AddRoundKey XORs the plaintext with the original key (Round 0). This visualization shows Round 1 — the first of 10 rounds that transforms the state.</p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Plaintext (32 hex chars = 16 bytes)</Label>
            <Input value={ptHex} onChange={e => setPtHex(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <Label className="text-xs">Key (32 hex chars = 16 bytes)</Label>
            <Input value={keyHex} onChange={e => setKeyHex(e.target.value)} className="font-mono text-xs" />
          </div>
          <Button onClick={doSetup} className="w-full">Compute Round 1</Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {initial && (
            <div className="flex flex-wrap gap-4 items-start">
              <StateMatrix state={initial} label="State after Initial AddRoundKey (Round 0)" />
            </div>
          )}
        </div>
      </StepCard>

      {/* Step 2: SubBytes */}
      <StepCard step={2} title="SubBytes" status={getStatus('subbytes')}>
        {initial && afterSub && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Each byte is independently replaced via the S-Box: compute the multiplicative inverse in GF(2⁸), then apply an affine transformation. This is the only nonlinear operation in AES — without it, the entire cipher would be a linear system solvable by Gaussian elimination. The highlighted cells below show which bytes changed.
            </p>
            <div className="flex flex-wrap gap-4 items-start">
              <StateMatrix state={initial} label="Before" />
              <div className="self-center text-xl text-muted-foreground hidden sm:block">→</div>
              <StateMatrix state={afterSub} label="After SubBytes" highlight={diffHighlight(initial, afterSub)} />
            </div>
            <FormulaBox>
              <p className="text-xs text-muted-foreground mb-1">Example: byte {initial[0][0].toString(16).padStart(2, '0')} → S-Box[0x{initial[0][0].toString(16).padStart(2, '0')}] = 0x{SBOX[initial[0][0]].toString(16).padStart(2, '0')}</p>
            </FormulaBox>
            <Button onClick={advance} variant="outline" className="w-full">Next: ShiftRows →</Button>
          </div>
        )}
      </StepCard>

      {/* Step 3: ShiftRows (animated spatial permutation) */}
      <StepCard step={3} title="ShiftRows (Spatial Permutation)" status={getStatus('shiftrows')}>
        {afterSub && afterShift && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Each row is cyclically shifted left by its row index (0, 1, 2, 3 positions). This ensures that the four bytes in each column after ShiftRows came from four different columns before it — so the next MixColumns step combines bytes from across the entire state. Without ShiftRows, MixColumns would only mix bytes within the same column, requiring many more rounds to achieve full diffusion.
            </p>
            <ShiftRowsAnimation before={afterSub} after={afterShift} />
            <Button onClick={advance} variant="outline" className="w-full">Next: MixColumns →</Button>
          </div>
        )}
      </StepCard>

      {/* Step 4: MixColumns */}
      <StepCard step={4} title="MixColumns (GF(2^8) Polynomial Multiply)" status={getStatus('mixcols')}>
        {afterShift && afterMix && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Each column is treated as a polynomial over GF(2⁸) and multiplied by a fixed matrix. The arithmetic uses the irreducible polynomial x⁸+x⁴+x³+x+1 (0x11b). "Multiply by 2" means left-shift, then XOR with 0x1b if the high bit was set. "Multiply by 3" is multiply-by-2 XOR the original. Select a column below to see the detailed GF arithmetic for each output byte.
            </p>
            <div className="flex flex-wrap gap-4 items-start">
              <StateMatrix state={afterShift} label="Before" />
              <div className="self-center text-xl text-muted-foreground hidden sm:block">→</div>
              <StateMatrix state={afterMix} label="After MixColumns" highlight={diffHighlight(afterShift, afterMix)} />
            </div>

            {/* Fixed matrix display */}
            <FormulaBox>
              <p className="text-xs text-muted-foreground mb-2">Fixed multiplication matrix:</p>
              <div className="grid grid-cols-4 gap-1 w-fit mb-3">
                {MIX_MATRIX.flatMap((row, i) =>
                  row.map((v, j) => (
                    <div key={`${i}-${j}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold rounded border bg-muted/50">
                      {v}
                    </div>
                  ))
                )}
              </div>

              {/* Column selector */}
              <p className="text-xs text-muted-foreground mb-1">Detailed computation for column:</p>
              <div className="flex gap-1 mb-3">
                {[0,1,2,3].map(c => (
                  <Badge
                    key={c}
                    variant={selectedCol === c ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCol(c)}
                  >
                    Col {c}
                  </Badge>
                ))}
              </div>

              {/* Detailed GF multiplication for selected column */}
              {(() => {
                const col = [afterShift[selectedCol][0], afterShift[selectedCol][1], afterShift[selectedCol][2], afterShift[selectedCol][3]];
                const detail = mixColumnDetail(col);
                return (
                  <div className="space-y-2">
                    <p className="text-xs">Input column: [{col.map(v => '0x' + v.toString(16).padStart(2, '0')).join(', ')}]</p>
                    {detail.map(d => (
                      <div key={d.row} className="text-xs border-t pt-1">
                        <span className="text-muted-foreground">result[{d.row}] = </span>
                        {d.terms.map((t, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-muted-foreground"> XOR </span>}
                            <span>GF({t.coeff}, 0x{t.input.toString(16).padStart(2, '0')})</span>
                            <span className="text-muted-foreground">=0x{t.product.toString(16).padStart(2, '0')}</span>
                          </span>
                        ))}
                        <span className="font-bold"> = 0x{d.result.toString(16).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </FormulaBox>
            <Button onClick={advance} variant="outline" className="w-full">Next: AddRoundKey →</Button>
          </div>
        )}
      </StepCard>

      {/* Step 5: AddRoundKey */}
      <StepCard step={5} title="AddRoundKey" status={getStatus('addrk')}>
        {afterMix && roundKey && afterARK && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              XOR the state with the round key derived from AES key expansion (each round key is generated from the original key using RotWord, SubWord, and Rcon). XOR is its own inverse — applying the same round key again would undo this step. The key schedule ensures each round uses a different subkey, so knowing one round key doesn't directly reveal others.
            </p>
            <div className="flex flex-wrap gap-4 items-start">
              <StateMatrix state={afterMix} label="State" size="sm" />
              <div className="self-center text-lg text-muted-foreground hidden sm:block">XOR</div>
              <StateMatrix state={roundKey} label="Round Key 1" size="sm" />
              <div className="self-center text-lg text-muted-foreground hidden sm:block">=</div>
              <StateMatrix state={afterARK} label="Result" size="sm" highlight={diffHighlight(afterMix, afterARK)} />
            </div>
            <FormulaBox>
              <p className="text-xs">Round 1 output: <span className="font-bold">{stateToHex(afterARK)}</span></p>
            </FormulaBox>
            <WebCryptoVerify
              label="Encrypt full AES-128 with Web Crypto (constant-time)"
              onVerify={async () => {
                const ptBytes = new Uint8Array(16);
                const keyBytes = new Uint8Array(16);
                const cleanPt = ptHex.replace(/\s+/g, '');
                const cleanKey = keyHex.replace(/\s+/g, '');
                for (let i = 0; i < 16; i++) {
                  ptBytes[i] = parseInt(cleanPt.substring(i*2, i*2+2), 16);
                  keyBytes[i] = parseInt(cleanKey.substring(i*2, i*2+2), 16);
                }
                const r = await webCryptoAESEncrypt(ptBytes, keyBytes);
                return {
                  success: true,
                  details: [
                    `Engine: Web Crypto ${r.mode} (constant-time native)`,
                    `Full ciphertext (all 10 rounds): ${bytesToHex(r.ciphertext)}`,
                    `Your Round 1 output: ${stateToHex(afterARK)}`,
                    `Note: Web Crypto runs all 10 rounds, so the outputs differ. Your step-by-step shows Round 1 only.`,
                  ],
                };
              }}
            />
          </div>
        )}
      </StepCard>
    </div>
  );
}
