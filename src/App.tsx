import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { ECCalculator } from '@/components/pages/ECCalculator';
import { RSACalculator } from '@/components/pages/RSACalculator';
import { ModularArithmetic } from '@/components/pages/ModularArithmetic';
import { BaseConverter } from '@/components/pages/BaseConverter';
import { Factorization } from '@/components/pages/Factorization';
import { CipherTools } from '@/components/pages/CipherTools';
import { ThemeToggle } from '@/components/ThemeToggle';

export type Page =
  | 'ec-calculator'
  | 'rsa'
  | 'modular'
  | 'converter'
  | 'factorization'
  | 'ciphers';

const PAGE_COMPONENTS: Record<Page, React.FC> = {
  'ec-calculator': ECCalculator,
  rsa: RSACalculator,
  modular: ModularArithmetic,
  converter: BaseConverter,
  factorization: Factorization,
  ciphers: CipherTools,
};

const PAGE_TITLES: Record<Page, string> = {
  'ec-calculator': 'Elliptic Curve Calculator',
  rsa: 'RSA Key Generator',
  modular: 'Modular Arithmetic',
  converter: 'Base & Text Converter',
  factorization: 'Integer Factorization',
  ciphers: 'Cipher Tools',
};

export default function App() {
  const [page, setPage] = useState<Page>('ec-calculator');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const PageComponent = PAGE_COMPONENTS[page];

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          currentPage={page}
          onPageChange={setPage}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-6 py-3">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold tracking-tight">{PAGE_TITLES[page]}</h1>
            </div>
            <ThemeToggle />
          </header>
          <div className="p-6 max-w-6xl mx-auto">
            <PageComponent />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
