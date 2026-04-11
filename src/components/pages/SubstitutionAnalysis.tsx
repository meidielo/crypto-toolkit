import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { countNgrams, sortedNgrams } from '@/lib/crypto-math';

const ENGLISH_FREQ: Record<string, number> = {
  E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1,
  R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2,
  G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15,
  Q: 0.10, Z: 0.07,
};

const ENGLISH_DIGRAPHS = 'TH,HE,AN,IN,ER,ON,RE,ED,ND,HA,AT,EN,ES,OF,NT,EA,TI,TO,IT,ST'.split(',');
const ENGLISH_TRIGRAPHS = 'THE,AND,THA,ENT,ION,TIO,FOR,NDE,HAS,NCE,TIS,OFT,MEN'.split(',');

export function SubstitutionAnalysis() {
  const [ciphertext, setCiphertext] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Debounce ciphertext to avoid re-computing ngrams on every keystroke
  const debouncedCiphertext = useDebouncedValue(ciphertext, 300);

  // Frequency analysis (uses debounced input)
  const freqs = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const c of debouncedCiphertext.toUpperCase()) {
      if (c >= 'A' && c <= 'Z') {
        counts[c] = (counts[c] || 0) + 1;
        total++;
      }
    }
    return Object.entries(counts)
      .map(([char, count]) => ({ char, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [debouncedCiphertext]);

  const totalLetters = freqs.reduce((s, f) => s + f.count, 0);

  // Digraphs / Trigraphs (debounced)
  const digraphs = useMemo(() => sortedNgrams(countNgrams(debouncedCiphertext, 2)).slice(0, 15), [debouncedCiphertext]);
  const trigraphs = useMemo(() => sortedNgrams(countNgrams(debouncedCiphertext, 3)).slice(0, 15), [debouncedCiphertext]);

  // Decoded text — uses debounced ciphertext for performance, instant mapping updates
  const decoded = useMemo(() => {
    return debouncedCiphertext.split('').map(c => {
      const upper = c.toUpperCase();
      if (upper >= 'A' && upper <= 'Z' && mapping[upper]) {
        return c === upper ? mapping[upper].toUpperCase() : mapping[upper].toLowerCase();
      }
      return c;
    }).join('');
  }, [debouncedCiphertext, mapping]);

  function setMap(cipher: string, plain: string) {
    setMapping(prev => {
      const next = { ...prev };
      if (plain === '') {
        delete next[cipher.toUpperCase()];
      } else {
        next[cipher.toUpperCase()] = plain.toUpperCase();
      }
      return next;
    });
  }

  function clearMapping() {
    setMapping({});
  }

  const unmapped = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !mapping[c]);

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Monoalphabetic Substitution Cipher Analysis</CardTitle>
          <CardDescription>
            Interactively break a substitution cipher using frequency analysis, digraphs, and trigraphs.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ciphertext Input</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={ciphertext}
            onChange={e => setCiphertext(e.target.value)}
            placeholder="Paste ciphertext here..."
            rows={5}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {ciphertext && (
        <Tabs defaultValue="freq">
          <TabsList className="w-full flex">
            <TabsTrigger value="freq">Frequencies</TabsTrigger>
            <TabsTrigger value="ngrams">Di/Trigraphs</TabsTrigger>
            <TabsTrigger value="decode">Decode</TabsTrigger>
          </TabsList>

          <TabsContent value="freq">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-end gap-0.5 h-40">
                  {freqs.map(({ char, pct }) => (
                    <div key={char} className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full bg-primary/30 rounded-t min-h-[2px] relative group"
                        style={{ height: `${Math.max(2, pct * 3)}px` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold mt-0.5">{char}</span>
                      <span className="text-[8px] text-muted-foreground">{pct.toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-medium mb-2">English Reference Frequencies:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(ENGLISH_FREQ).sort((a, b) => b[1] - a[1]).map(([char, freq]) => (
                      <span key={char} className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted border">
                        {char}:{freq}%
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-medium mb-2">Total letters: {totalLetters}</p>
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Cipher</th>
                        <th className="text-left py-1">Count</th>
                        <th className="text-left py-1">%</th>
                        <th className="text-left py-1">English match?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freqs.map(({ char, count, pct }) => {
                        const engOrder = Object.entries(ENGLISH_FREQ).sort((a, b) => b[1] - a[1]);
                        const rank = freqs.findIndex(f => f.char === char);
                        const suggestedChar = rank < engOrder.length ? engOrder[rank][0] : '?';
                        return (
                          <tr key={char} className="border-b hover:bg-muted/50">
                            <td className="py-1 font-bold">{char}</td>
                            <td className="py-1">{count}</td>
                            <td className="py-1">{pct.toFixed(1)}%</td>
                            <td className="py-1 text-muted-foreground">{suggestedChar} ({ENGLISH_FREQ[suggestedChar]}%)</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ngrams">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Digraphs (Top 15)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {digraphs.map(([ngram, count], i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-mono">
                        <Badge variant="outline" className="w-10 justify-center">{ngram}</Badge>
                        <span className="text-muted-foreground">{count}</span>
                        <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-primary/40 rounded" style={{ width: `${(count / (digraphs[0]?.[1] || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    English top digraphs: {ENGLISH_DIGRAPHS.join(', ')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Trigraphs (Top 15)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {trigraphs.map(([ngram, count], i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-mono">
                        <Badge variant="outline" className="w-12 justify-center">{ngram}</Badge>
                        <span className="text-muted-foreground">{count}</span>
                        <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-primary/40 rounded" style={{ width: `${(count / (trigraphs[0]?.[1] || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    English top trigraphs: {ENGLISH_TRIGRAPHS.join(', ')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="decode">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Substitution Table</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-7 sm:grid-cols-13 gap-1">
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => (
                      <div key={c} className="text-center">
                        <span className="text-xs font-mono font-bold block">{c}</span>
                        <Input
                          value={mapping[c] || ''}
                          onChange={e => setMap(c, e.target.value.slice(-1))}
                          className="font-mono text-center h-7 px-0 text-xs"
                          maxLength={1}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearMapping}>Clear All</Button>
                    <span className="text-xs text-muted-foreground self-center">
                      Unmapped: {unmapped.join(', ') || 'none'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Decoded Text (Live Preview)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4 max-h-64 overflow-auto">
                    {decoded.split('').map((c, i) => {
                      const orig = debouncedCiphertext[i];
                      const isDecoded = orig && orig.toUpperCase() >= 'A' && orig.toUpperCase() <= 'Z' && mapping[orig.toUpperCase()];
                      return (
                        <span key={i} className={isDecoded ? 'text-green-600 dark:text-green-400 font-bold' : ''}>
                          {c}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
