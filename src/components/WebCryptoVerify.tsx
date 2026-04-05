import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WebCryptoVerifyProps {
  label: string;
  onVerify: () => Promise<{ success: boolean; details: string[] }>;
}

export function WebCryptoVerify({ label, onVerify }: WebCryptoVerifyProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; details: string[] } | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const r = await onVerify();
      setResult(r);
    } catch (e) {
      setResult({ success: false, details: [`Error: ${e}`] });
    }
    setRunning(false);
  }

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          Web Crypto API Comparison (Constant-Time)
        </span>
      </div>
      <Button
        onClick={run}
        disabled={running}
        variant="outline"
        size="sm"
        className="w-full border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
      >
        {running ? 'Running native crypto...' : label}
      </Button>
      {result && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant={result.success ? 'default' : 'destructive'} className="text-[10px]">
              {result.success ? 'Verified' : 'Failed'}
            </Badge>
            <span className="text-[10px] text-muted-foreground">via crypto.subtle (constant-time native C/C++)</span>
          </div>
          {result.details.map((d, i) => (
            <p key={i} className="text-[10px] font-mono text-muted-foreground break-all">{d}</p>
          ))}
        </div>
      )}
    </div>
  );
}
