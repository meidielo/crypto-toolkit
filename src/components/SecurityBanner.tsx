import { useState, useEffect } from 'react';

const STORAGE_KEY = 'crypto-toolkit-banner-dismissed';

export function SecurityBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === 'true'; }
    catch { return false; }
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, String(dismissed)); }
    catch { /* ignore */ }
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg mb-4 overflow-hidden transition-all">
      <div className="flex items-center gap-2 px-3 py-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex-1">
          Educational Tool — BigInt arithmetic is not constant-time
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-amber-500/70 hover:text-amber-400 shrink-0"
        >
          {expanded ? 'Less' : 'More'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500/50 hover:text-amber-400 shrink-0 ml-1"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-2.5 text-[11px] text-amber-600/70 dark:text-amber-400/60 leading-relaxed border-t border-amber-500/10 pt-2">
          Operations like <code className="text-[10px] bg-amber-500/10 px-1 rounded">modPow</code>,{' '}
          <code className="text-[10px] bg-amber-500/10 px-1 rounded">modInverse</code>, and EC{' '}
          <code className="text-[10px] bg-amber-500/10 px-1 rounded">scalarMultiply</code> have
          data-dependent branching that leaks key bits via timing side-channels.
          This tool uses <code className="text-[10px] bg-amber-500/10 px-1 rounded">crypto.getRandomValues()</code> (CSPRNG)
          for randomness. Never use this code for production cryptography.
        </div>
      )}
    </div>
  );
}

// Inline warning for specific pages
export function InlineWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
