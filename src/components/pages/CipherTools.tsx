import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { caesarCipher, vigenereCipher, rot13, atbashCipher } from '@/lib/crypto-math';

export function CipherTools() {
  // Caesar
  const [caesarInput, setCaesarInput] = useState('');
  const [caesarShift, setCaesarShift] = useState('3');
  const [caesarResult, setCaesarResult] = useState('');
  const [caesarMode, setCaesarMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  // Vigenere
  const [vigInput, setVigInput] = useState('');
  const [vigKey, setVigKey] = useState('');
  const [vigResult, setVigResult] = useState('');
  const [vigMode, setVigMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  // ROT13 / Atbash
  const [rotInput, setRotInput] = useState('');
  const [rotResult, setRotResult] = useState('');

  // Caesar brute force
  const [bruteInput, setBruteInput] = useState('');
  const [bruteResults, setBruteResults] = useState<{ shift: number; text: string }[]>([]);

  // Frequency analysis
  const [freqInput, setFreqInput] = useState('');
  const [freqResult, setFreqResult] = useState<{ char: string; count: number; pct: string }[]>([]);

  function doCaesar() {
    const shift = parseInt(caesarShift) || 0;
    setCaesarResult(caesarCipher(caesarInput, shift, caesarMode === 'decrypt'));
  }

  function doVigenere() {
    setVigResult(vigenereCipher(vigInput, vigKey, vigMode === 'decrypt'));
  }

  function doRot() {
    setRotResult(`ROT13: ${rot13(rotInput)}\nAtbash: ${atbashCipher(rotInput)}`);
  }

  function doBruteForce() {
    const results: { shift: number; text: string }[] = [];
    for (let i = 0; i < 26; i++) {
      results.push({ shift: i, text: caesarCipher(bruteInput, i, true) });
    }
    setBruteResults(results);
  }

  function doFrequency() {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const c of freqInput.toUpperCase()) {
      if (c >= 'A' && c <= 'Z') {
        counts[c] = (counts[c] || 0) + 1;
        total++;
      }
    }
    const result = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([char, count]) => ({
        char,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%',
      }));
    setFreqResult(result);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Classical Cipher Tools</CardTitle>
          <CardDescription>
            Encrypt, decrypt, and analyze text with classical ciphers — Caesar, Vigenere, ROT13, and Atbash.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold">The problem</p>
        <p className="text-muted-foreground">Classical ciphers (Caesar, Vigenere, etc.) are the foundation of cryptography education — understanding why they are broken helps explain why modern ciphers are designed the way they are.</p>
        <p className="font-semibold mt-3">The insight</p>
        <p className="text-muted-foreground">Caesar shifts by a fixed amount (breakable by trying all 26 shifts). Vigenere uses a repeating keyword (breakable by Kasiski examination + frequency analysis on each column). These ciphers teach the core principles: confusion (substitution), diffusion (spreading plaintext influence), and key space size (why 26 possible keys is not enough).</p>
      </div>

      <Tabs defaultValue="caesar">
        <TabsList className="w-full flex">
          <TabsTrigger value="caesar">Caesar</TabsTrigger>
          <TabsTrigger value="vigenere">Vigenere</TabsTrigger>
          <TabsTrigger value="rot13">ROT13/Atbash</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Caesar */}
        <TabsContent value="caesar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Caesar Cipher</CardTitle>
                <CardDescription>Shift each letter by a fixed amount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge
                    variant={caesarMode === 'encrypt' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setCaesarMode('encrypt')}
                  >
                    Encrypt
                  </Badge>
                  <Badge
                    variant={caesarMode === 'decrypt' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setCaesarMode('decrypt')}
                  >
                    Decrypt
                  </Badge>
                </div>
                <div>
                  <Label>Text</Label>
                  <Textarea value={caesarInput} onChange={e => setCaesarInput(e.target.value)} rows={3} className="font-mono" placeholder="Enter text..." />
                </div>
                <div>
                  <Label>Shift (0-25)</Label>
                  <Input value={caesarShift} onChange={e => setCaesarShift(e.target.value)} className="font-mono w-24" placeholder="3" />
                </div>
                <Button onClick={doCaesar} className="w-full">
                  {caesarMode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
                </Button>
                {caesarResult && (
                  <div className="rounded-md border bg-muted/50 p-3">
                    <Label className="text-xs text-muted-foreground">Result</Label>
                    <p className="font-mono text-sm whitespace-pre-wrap">{caesarResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brute Force</CardTitle>
                <CardDescription>Try all 26 shifts to find the plaintext</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Ciphertext</Label>
                  <Textarea value={bruteInput} onChange={e => setBruteInput(e.target.value)} rows={2} className="font-mono" placeholder="Encrypted text..." />
                </div>
                <Button onClick={doBruteForce} className="w-full">Brute Force All Shifts</Button>
                {bruteResults.length > 0 && (
                  <div className="max-h-72 overflow-auto space-y-1">
                    {bruteResults.map(({ shift, text }) => (
                      <div key={shift} className="flex items-center gap-2 text-sm font-mono py-0.5">
                        <Badge variant="outline" className="text-xs w-12 justify-center shrink-0">{shift}</Badge>
                        <span className="truncate">{text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vigenere */}
        <TabsContent value="vigenere">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vigenere Cipher</CardTitle>
              <CardDescription>Polyalphabetic substitution using a keyword</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge
                  variant={vigMode === 'encrypt' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setVigMode('encrypt')}
                >
                  Encrypt
                </Badge>
                <Badge
                  variant={vigMode === 'decrypt' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setVigMode('decrypt')}
                >
                  Decrypt
                </Badge>
              </div>
              <div>
                <Label>Text</Label>
                <Textarea value={vigInput} onChange={e => setVigInput(e.target.value)} rows={3} className="font-mono" placeholder="Enter text..." />
              </div>
              <div>
                <Label>Key</Label>
                <Input value={vigKey} onChange={e => setVigKey(e.target.value)} className="font-mono" placeholder="SECRET" />
              </div>
              <Button onClick={doVigenere} className="w-full">
                {vigMode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
              </Button>
              {vigResult && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <Label className="text-xs text-muted-foreground">Result</Label>
                  <p className="font-mono text-sm whitespace-pre-wrap">{vigResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROT13 / Atbash */}
        <TabsContent value="rot13">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ROT13 & Atbash</CardTitle>
              <CardDescription>Quick substitution ciphers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Text</Label>
                <Textarea value={rotInput} onChange={e => setRotInput(e.target.value)} rows={3} className="font-mono" placeholder="Enter text..." />
              </div>
              <Button onClick={doRot} className="w-full">Transform</Button>
              {rotResult && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="font-mono text-sm whitespace-pre-wrap">{rotResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frequency Analysis */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frequency Analysis</CardTitle>
              <CardDescription>Count letter frequencies to help break substitution ciphers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Ciphertext</Label>
                <Textarea value={freqInput} onChange={e => setFreqInput(e.target.value)} rows={4} className="font-mono" placeholder="Paste ciphertext here..." />
              </div>
              <Button onClick={doFrequency} className="w-full">Analyze Frequencies</Button>
              {freqResult.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 sm:grid-cols-13 gap-1">
                    {freqResult.map(({ char, pct }) => (
                      <div key={char} className="text-center">
                        <div
                          className="bg-primary/20 rounded-t mx-auto w-6"
                          style={{ height: `${Math.max(4, parseFloat(pct) * 3)}px` }}
                        />
                        <span className="text-xs font-mono font-bold">{char}</span>
                        <span className="text-xs text-muted-foreground block">{pct}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    English letter frequency order: E T A O I N S H R D L C U M W F G Y P B V K J X Q Z
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
