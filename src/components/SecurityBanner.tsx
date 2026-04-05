import { useState, useEffect } from 'react';

const STORAGE_KEY = 'crypto-toolkit-banner-dismissed';

export function SecurityBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(dismissed)); }
    catch { /* ignore */ }
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0 mt-0.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Educational Tool Only</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
          This toolkit uses JavaScript BigInt arithmetic which is <strong>not constant-time</strong>.
          Real cryptographic implementations require constant-time operations to prevent side-channel
          timing attacks. Random number generation uses <code className="text-[10px]">Math.random</code>, not a CSPRNG.
          Never use this code for production cryptography.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 shrink-0 p-0.5"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
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
