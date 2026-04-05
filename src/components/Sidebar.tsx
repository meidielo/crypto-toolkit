import type { Page } from '@/App';
import { cn } from '@/lib/utils';

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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'modular',
    label: 'Modular Arithmetic',
    category: 'Number Theory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'factorization',
    label: 'Factorization',
    category: 'Number Theory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'ciphers',
    label: 'Cipher Tools',
    category: 'Cryptography',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ currentPage, onPageChange, open, onToggle }: SidebarProps) {
  if (!open) return null;

  const categories = Array.from(new Set(NAV_ITEMS.map(i => i.category)));

  return (
    <aside className="w-64 border-r bg-card flex flex-col shrink-0 h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CT</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm leading-none">CryptoToolkit</h2>
            <span className="text-xs text-muted-foreground">v1.0</span>
          </div>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:bg-muted text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-auto p-3 space-y-4">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
              {cat}
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter(i => i.category === cat).map(item => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    currentPage === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Educational use. Built with BigInt arithmetic.
        </p>
      </div>
    </aside>
  );
}
