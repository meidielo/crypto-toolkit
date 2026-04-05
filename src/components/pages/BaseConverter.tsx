import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  textToHex,
  hexToText,
  textToBinary,
  textToDecimal,
  textToBase64,
  numberToBase,
  baseToNumber,
} from '@/lib/crypto-math';

export function BaseConverter() {
  // Text encoding
  const [textInput, setTextInput] = useState('');
  const [hexOut, setHexOut] = useState('');
  const [binOut, setBinOut] = useState('');
  const [decOut, setDecOut] = useState('');
  const [b64Out, setB64Out] = useState('');

  // Reverse
  const [hexInput, setHexInput] = useState('');
  const [hexDecoded, setHexDecoded] = useState('');

  // Number base conversion
  const [numInput, setNumInput] = useState('');
  const [fromBase, setFromBase] = useState('10');
  const [toBase, setToBase] = useState('16');
  const [numResult, setNumResult] = useState('');
  const [numError, setNumError] = useState('');

  // Hashing
  const [hashInput, setHashInput] = useState('');
  const [lineEnding, setLineEnding] = useState<'lf' | 'crlf'>('lf');
  const [sha1Hash, setSha1Hash] = useState('');
  const [sha256Hash, setSha256Hash] = useState('');
  const [sha1Dec, setSha1Dec] = useState('');
  const [sha256Dec, setSha256Dec] = useState('');

  function encodeText() {
    try {
      setHexOut(textToHex(textInput));
      setBinOut(textToBinary(textInput));
      setDecOut(textToDecimal(textInput));
      setB64Out(textToBase64(textInput));
    } catch { /* ignore */ }
  }

  function decodeHex() {
    try {
      setHexDecoded(hexToText(hexInput));
    } catch { setHexDecoded('Invalid hex'); }
  }

  function convertBase() {
    setNumError('');
    try {
      const fb = parseInt(fromBase);
      const tb = parseInt(toBase);
      if (fb < 2 || fb > 16 || tb < 2 || tb > 16) {
        setNumError('Bases must be 2-16');
        return;
      }
      const n = baseToNumber(numInput, fb);
      setNumResult(numberToBase(n, tb));
    } catch (e) {
      setNumError(String(e));
    }
  }

  async function computeHash() {
    try {
      let text = hashInput;
      if (lineEnding === 'crlf') {
        text = text.replace(/\n/g, '\r\n');
      } else {
        text = text.replace(/\r\n/g, '\n');
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      const sha1Buf = await crypto.subtle.digest('SHA-1', data);
      const sha256Buf = await crypto.subtle.digest('SHA-256', data);

      const sha1Hex = Array.from(new Uint8Array(sha1Buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const sha256Hex = Array.from(new Uint8Array(sha256Buf)).map(b => b.toString(16).padStart(2, '0')).join('');

      setSha1Hash(sha1Hex);
      setSha256Hash(sha256Hex);

      // Convert hex to decimal BigInt
      setSha1Dec(BigInt('0x' + sha1Hex).toString(10));
      setSha256Dec(BigInt('0x' + sha256Hex).toString(10));
    } catch (e) {
      setSha1Hash('Error: ' + String(e));
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hash">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="hash">Hashing</TabsTrigger>
          <TabsTrigger value="text">Text Encoding</TabsTrigger>
          <TabsTrigger value="number">Number Base</TabsTrigger>
        </TabsList>

        {/* Hashing */}
        <TabsContent value="hash">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SHA Hash Calculator</CardTitle>
              <CardDescription>
                Hash text with SHA-1 and SHA-256. See hex and decimal (BigInt) representations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message</Label>
                <Textarea
                  value={hashInput}
                  onChange={e => setHashInput(e.target.value)}
                  placeholder="Enter text to hash..."
                  rows={4}
                  className="font-mono"
                />
              </div>
              <div className="flex items-center gap-4">
                <Label className="text-sm">Line Endings:</Label>
                <div className="flex gap-2">
                  <Badge
                    variant={lineEnding === 'lf' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setLineEnding('lf')}
                  >
                    LF (\n)
                  </Badge>
                  <Badge
                    variant={lineEnding === 'crlf' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setLineEnding('crlf')}
                  >
                    CRLF (\r\n)
                  </Badge>
                </div>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  Line endings change the hash! Be careful.
                </span>
              </div>
              <Button onClick={computeHash} className="w-full">Compute Hash</Button>
              {sha1Hash && (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">SHA-1</Badge>
                    </div>
                    <p className="font-mono text-sm break-all"><span className="text-muted-foreground">Hex:</span> {sha1Hash}</p>
                    <p className="font-mono text-sm break-all"><span className="text-muted-foreground">Dec:</span> {sha1Dec}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">SHA-256</Badge>
                    </div>
                    <p className="font-mono text-sm break-all"><span className="text-muted-foreground">Hex:</span> {sha256Hash}</p>
                    <p className="font-mono text-sm break-all"><span className="text-muted-foreground">Dec:</span> {sha256Dec}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text Encoding */}
        <TabsContent value="text">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Text → Multiple Formats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Input Text</Label>
                  <Textarea
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder="Hello World"
                    rows={2}
                    className="font-mono"
                  />
                </div>
                <Button onClick={encodeText} className="w-full">Convert</Button>
                {hexOut && (
                  <div className="space-y-2">
                    <div className="rounded-md border bg-muted/50 p-2.5">
                      <span className="text-xs text-muted-foreground">Hex:</span>
                      <p className="font-mono text-sm break-all">{hexOut}</p>
                    </div>
                    <div className="rounded-md border bg-muted/50 p-2.5">
                      <span className="text-xs text-muted-foreground">Binary:</span>
                      <p className="font-mono text-sm break-all">{binOut}</p>
                    </div>
                    <div className="rounded-md border bg-muted/50 p-2.5">
                      <span className="text-xs text-muted-foreground">Decimal (ASCII):</span>
                      <p className="font-mono text-sm break-all">{decOut}</p>
                    </div>
                    <div className="rounded-md border bg-muted/50 p-2.5">
                      <span className="text-xs text-muted-foreground">Base64:</span>
                      <p className="font-mono text-sm break-all">{b64Out}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hex → Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Hex Input</Label>
                  <Input value={hexInput} onChange={e => setHexInput(e.target.value)} className="font-mono" placeholder="48 65 6c 6c 6f" />
                </div>
                <Button onClick={decodeHex} size="sm" className="w-full">Decode</Button>
                {hexDecoded && (
                  <div className="rounded-md border bg-muted/50 p-2.5">
                    <span className="text-xs text-muted-foreground">Decoded:</span>
                    <p className="font-mono text-sm">{hexDecoded}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Number Base Conversion */}
        <TabsContent value="number">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Number Base Converter</CardTitle>
              <CardDescription>Convert between bases 2-16 (binary, octal, decimal, hex)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Number</Label>
                <Input value={numInput} onChange={e => setNumInput(e.target.value)} className="font-mono" placeholder="ff" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Base</Label>
                  <Input value={fromBase} onChange={e => setFromBase(e.target.value)} className="font-mono" placeholder="16" />
                  <div className="flex gap-1 mt-1">
                    {[2, 8, 10, 16].map(b => (
                      <Badge key={b} variant="outline" className="cursor-pointer text-xs" onClick={() => setFromBase(b.toString())}>
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>To Base</Label>
                  <Input value={toBase} onChange={e => setToBase(e.target.value)} className="font-mono" placeholder="10" />
                  <div className="flex gap-1 mt-1">
                    {[2, 8, 10, 16].map(b => (
                      <Badge key={b} variant="outline" className="cursor-pointer text-xs" onClick={() => setToBase(b.toString())}>
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={convertBase} className="w-full">Convert</Button>
              {numError && <p className="text-sm text-destructive">{numError}</p>}
              {numResult && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">Result (base {toBase}):</span>
                  <p className="font-mono text-lg break-all">{numResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
