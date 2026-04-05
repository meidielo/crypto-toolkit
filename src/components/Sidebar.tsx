import type { Page } from '@/App';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

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
];

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

export function Sidebar({ currentPage, onPageChange, open, onToggle, isMobile }: SidebarProps) {
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

  const categories = Array.from(new Set(NAV_ITEMS.map(i => i.category)));

  const sidebarContent = (
    <aside className={cn(
      'bg-card flex flex-col h-full',
      isMobile ? 'w-72' : 'w-64 border-r shrink-0',
    )}>
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
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
              {cat}
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter(i => i.category === cat).map(item => (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
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
          </div>
        ))}
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
        <div className="animate-in slide-in-from-left duration-200">
          {sidebarContent}
        </div>
        <div
          className="flex-1 bg-black/50 animate-in fade-in duration-200"
          onClick={onToggle}
        />
      </div>
    );
  }

  // Desktop: static sidebar
  return sidebarContent;
}
