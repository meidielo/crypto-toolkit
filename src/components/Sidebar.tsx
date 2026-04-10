import type { Page } from '@/App';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  category: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'ec-calculator',
    label: 'Elliptic Curves',
    category: 'Cryptography',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    id: 'rsa',
    label: 'RSA Generator',
    category: 'Cryptography',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'ciphers',
    label: 'Cipher Tools',
    category: 'Cryptography',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 'modular',
    label: 'Modular Arithmetic',
    category: 'Number Theory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'factorization',
    label: 'Factorization',
    category: 'Number Theory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    id: 'converter',
    label: 'Base & Encoding',
    category: 'Utilities',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'ecdsa',
    label: 'ECDSA Signing',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    id: 'paillier',
    label: 'Paillier',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    id: 'elgamal',
    label: 'ElGamal',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    id: 'rsa-attack',
    label: 'RSA Attack',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    id: 'substitution',
    label: 'Substitution Analysis',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    id: 'diffie-hellman',
    label: 'Diffie-Hellman',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'aes',
    label: 'AES Round',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'nonce-reuse',
    label: 'Nonce Reuse Attack',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'lwe',
    label: 'Lattice (LWE)',
    category: 'Advanced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    id: 'schnorr',
    label: 'Schnorr ZKP',
    category: 'Advanced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'aes-gcm',
    label: 'AES-GCM',
    category: 'Composition',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: 'argon2',
    label: 'Argon2id',
    category: 'Composition',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h4M14 12h4M10 6v12M14 6v12" />
      </svg>
    ),
  },
  {
    id: 'tls13',
    label: 'TLS 1.3 Handshake',
    category: 'Composition',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'padding-oracle',
    label: 'Padding Oracle',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    ),
  },
  {
    id: 'textbook-rsa',
    label: 'Textbook RSA',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 'hash-extension',
    label: 'Hash Extension',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
      </svg>
    ),
  },
  {
    id: 'shamir',
    label: 'Shamir Secret Sharing',
    category: 'Workflows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="5" cy="19" r="2" />
        <path d="M12 9V5M15 12h4M12 15v4M9 12H5" />
      </svg>
    ),
  },
  {
    id: 'gcm-nonce',
    label: 'GCM Nonce Reuse',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M12 9v4M12 17h.01M5.07 19H19a2 2 0 001.75-2.75L13.75 4a2 2 0 00-3.5 0L3.32 16.25A2 2 0 005.07 19z" />
      </svg>
    ),
  },
  {
    id: 'dh-subgroup',
    label: 'DH Subgroup Attack',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" />
      </svg>
    ),
  },
  {
    id: 'wiener',
    label: "Wiener's Attack",
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: 'hmac',
    label: 'HMAC Walkthrough',
    category: 'Composition',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: 'mitm',
    label: 'Meet-in-the-Middle',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M5 3v18M19 3v18M5 12h14" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    id: 'ecb-penguin',
    label: 'ECB Penguin',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'curve-plot',
    label: 'EC Curve Plot',
    category: 'Utilities',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="7.5" cy="7.5" r="1.5" /><circle cx="16.5" cy="7.5" r="1.5" /><circle cx="12" cy="16" r="1.5" /><circle cx="4" cy="14" r="1.5" /><circle cx="20" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    id: 'bleichenbacher',
    label: 'Bleichenbacher',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    ),
  },
  {
    id: 'coppersmith',
    label: 'Hastad Broadcast',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    id: 'crt-fault',
    label: 'CRT Fault Injection',
    category: 'Attacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 'birthday',
    label: 'Birthday Collision',
    category: 'Advanced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </svg>
    ),
  },
  {
    id: 'lll',
    label: 'LLL Reduction',
    category: 'Advanced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M2 20L12 4l10 16" /><line x1="4" y1="16" x2="20" y2="16" />
      </svg>
    ),
  },
  {
    id: 'constant-time',
    label: 'Constant-Time',
    category: 'Advanced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

const COLLAPSED_STORAGE_KEY = 'crypto-toolkit:sidebar-collapsed';

export function Sidebar({ currentPage, onPageChange, open, onToggle, isMobile }: SidebarProps) {
  const categories = Array.from(new Set(NAV_ITEMS.map(i => i.category)));
  // Which category contains the active page? Used to auto-expand on mount and
  // whenever the user navigates, so opening the sidebar always reveals "where
  // am I?" without requiring the user to hunt through collapsed groups.
  const activeCategory = NAV_ITEMS.find(i => i.id === currentPage)?.category;
  // Persist collapsed categories to localStorage so reloads remember the user's
  // chosen layout. Falls back to "all collapsed except active" on first visit
  // or when storage is unavailable (private mode, quota errors, etc.).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const initial = new Set(categories);
    if (activeCategory) initial.delete(activeCategory);
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const stored = new Set(parsed.filter((s: unknown): s is string => typeof s === 'string'));
          // Always expand the active category on load even if localStorage had it collapsed.
          if (activeCategory) stored.delete(activeCategory);
          return stored;
        }
      }
    } catch { /* ignore corrupt storage */ }
    return initial;
  });

  // Derive the actually-rendered collapsed set: the persisted user preference
  // with the active category forcibly expanded. Using a derived value rather
  // than a setState-in-effect keeps the component's effect-free and dodges
  // the react-hooks/set-state-in-effect lint rule (this is "state sync from
  // state", which React prefers you compute during render).
  const renderedCollapsed = useMemo(() => {
    if (!activeCategory || !collapsed.has(activeCategory)) return collapsed;
    const next = new Set(collapsed);
    next.delete(activeCategory);
    return next;
  }, [collapsed, activeCategory]);

  function toggleCategory(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch { /* ignore quota errors */ }
      return next;
    });
  }

  // Close sidebar on page change (mobile only)
  const handlePageChange = (page: Page) => {
    onPageChange(page);
    if (isMobile) onToggle();
  };

  // Close on Escape
  useEffect(() => {
    if (!isMobile || !open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile, open, onToggle]);

  if (!open) return null;

  const sidebarContent = (
    <aside
      aria-label="Tool navigation"
      className={cn(
        'bg-card flex flex-col h-full',
        isMobile ? 'w-72' : 'w-64 border-l shrink-0',
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">CT</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-none truncate">CryptoToolkit</h2>
            <span className="text-xs text-muted-foreground">v1.0</span>
          </div>
        </div>
        <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMobile
              ? <path d="M18 6L6 18M6 6l12 12" />
              : <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {categories.map(cat => {
          const items = NAV_ITEMS.filter(i => i.category === cat);
          const isCollapsed = renderedCollapsed.has(cat);
          const hasActive = items.some(i => i.id === currentPage);

          return (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${cat} category`}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors rounded"
              >
                <span className="flex items-center gap-1">
                  {cat}
                  {hasActive && isCollapsed && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={cn('transition-transform shrink-0', isCollapsed ? '-rotate-90' : 'rotate-0')}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5 mt-0.5">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handlePageChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-left',
                        currentPage === item.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <p className="text-[11px] text-muted-foreground text-center">
          Educational use. Built with BigInt arithmetic.
        </p>
      </div>
    </aside>
  );

  // Mobile: fixed overlay with backdrop
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div
          className="flex-1 bg-black/50 animate-in fade-in duration-200"
          onClick={onToggle}
        />
        <div className="animate-in slide-in-from-right duration-200">
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Desktop: static sidebar
  return sidebarContent;
}
