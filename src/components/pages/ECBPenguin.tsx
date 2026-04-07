import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StepCard, FormulaBox } from '@/components/StepCard';
import { InlineWarning } from '@/components/SecurityBanner';
import { aesECB, bytesToHexAES, hexToBytesAES } from '@/lib/aes-math';

export function ECBPenguin() {
  const [keyHex, setKeyHex] = useState('000102030405060708090a0b0c0d0e0f');
  const [plaintext, setPlaintext] = useState('AAAAAAAAAAAAAAAA BBBBBBBBBBBBBBBB AAAAAAAAAAAAAAAA CCCCCCCCCCCCCCCC AAAAAAAAAAAAAAAA');
  const [blocks, setBlocks] = useState<{ pt: string; ct: string; ptHex: string }[]>([]);
  const [error, setError] = useState('');

  function doEncrypt() {
    setError('');
    try {
      const key = hexToBytesAES(keyHex);
      if (key.length !== 16) { setError('Key must be 16 bytes'); return; }
      const encoder = new TextEncoder();
      const ptBytes = Array.from(encoder.encode(plaintext));

      // Pad to 16-byte blocks
      while (ptBytes.length % 16 !== 0) ptBytes.push(0);

      const result: { pt: string; ct: string; ptHex: string }[] = [];
      for (let i = 0; i < ptBytes.length; i += 16) {
        const block = ptBytes.slice(i, i + 16);
        const ct = aesECB(block, key);
        const ptText = block.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('');
        result.push({
          pt: ptText,
          ptHex: bytesToHexAES(block),
          ct: bytesToHexAES(ct),
        });
      }
      setBlocks(result);
    } catch (e) { setError(String(e)); }
  }

  // Color map: same ciphertext = same color
  const ctColors = new Map<string, string>();
  const colors = [
    'bg-red-500/30', 'bg-blue-500/30', 'bg-green-500/30', 'bg-purple-500/30',
    'bg-yellow-500/30', 'bg-pink-500/30', 'bg-cyan-500/30', 'bg-orange-500/30',
  ];
  let colorIdx = 0;
  blocks.forEach(b => {
    if (!ctColors.has(b.ct)) ctColors.set(b.ct, colors[colorIdx++ % colors.length]);
  });

  return (
    <div className="space-y-4">
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">ECB Mode Pattern Leakage</CardTitle>
          <CardDescription>
            AES-ECB encrypts each 16-byte block independently. Identical plaintext blocks produce
            identical ciphertext blocks, revealing data patterns. This is the "ECB penguin" problem.
          </CardDescription>
        </CardHeader>
      </Card>

      <StepCard step={1} title="Encrypt with AES-ECB" status={blocks.length > 0 ? 'complete' : 'active'}>
        <InlineWarning>
          ECB mode has NO diffusion between blocks. Repeated plaintext patterns are visible in ciphertext.
          Never use ECB for data longer than one block.
        </InlineWarning>
        <div><Label className="text-xs">Key (32 hex = 16 bytes)</Label><Input value={keyHex} onChange={e => setKeyHex(e.target.value)} className="font-mono text-xs" /></div>
        <div><Label className="text-xs">Plaintext (repeated patterns reveal structure)</Label><Input value={plaintext} onChange={e => setPlaintext(e.target.value)} className="font-mono" /></div>
        <Button onClick={doEncrypt} className="w-full">Encrypt (ECB Mode)</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </StepCard>

      {blocks.length > 0 && (
        <StepCard step={2} title="Pattern Leakage Visualization" status="active">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Blocks with the same color have identical ciphertext — an attacker sees the data structure.
            </p>

            {/* Visual block grid */}
            <div className="flex flex-wrap gap-1">
              {blocks.map((b, i) => (
                <div
                  key={i}
                  className={`rounded px-2 py-1 text-[10px] font-mono border ${ctColors.get(b.ct)}`}
                  title={`PT: ${b.pt}\nCT: ${b.ct}`}
                >
                  Block {i}
                </div>
              ))}
            </div>

            {/* Detailed table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2">#</th>
                    <th className="text-left py-1 px-2">Plaintext</th>
                    <th className="text-left py-1 px-2">Ciphertext</th>
                    <th className="text-left py-1 px-2">Duplicate?</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b, i) => {
                    const isDup = blocks.findIndex(x => x.ct === b.ct) < i;
                    return (
                      <tr key={i} className={`border-b ${ctColors.get(b.ct)}`}>
                        <td className="py-1 px-2">{i}</td>
                        <td className="py-1 px-2">{b.pt}</td>
                        <td className="py-1 px-2 break-all">{b.ct}</td>
                        <td className="py-1 px-2">{isDup ? 'YES — same as earlier block' : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <FormulaBox>
              <p className="text-xs text-muted-foreground">
                Unique ciphertext blocks: {ctColors.size} / {blocks.length} total.
                {ctColors.size < blocks.length && (
                  <span className="text-red-500 font-semibold"> Pattern leaked — {blocks.length - ctColors.size} duplicate blocks visible.</span>
                )}
              </p>
            </FormulaBox>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">The ECB Penguin</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                If you encrypt an image with ECB, the outline of the image is visible in the ciphertext
                because identical pixel blocks encrypt to identical ciphertext blocks. This is why
                CBC, CTR, and GCM modes exist — they chain blocks together so identical plaintexts
                produce different ciphertexts.
              </p>
            </div>
          </div>
        </StepCard>
      )}
    </div>
  );
}
