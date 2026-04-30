import { useState, useEffect, lazy, Suspense } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SecurityBanner } from '@/components/SecurityBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Home } from '@/components/pages/Home';

// Lazy-load all page components for code splitting
const ECCalculator = lazy(() => import('@/components/pages/ECCalculator').then(m => ({ default: m.ECCalculator })));
const RSACalculator = lazy(() => import('@/components/pages/RSACalculator').then(m => ({ default: m.RSACalculator })));
const ModularArithmetic = lazy(() => import('@/components/pages/ModularArithmetic').then(m => ({ default: m.ModularArithmetic })));
const BaseConverter = lazy(() => import('@/components/pages/BaseConverter').then(m => ({ default: m.BaseConverter })));
const Factorization = lazy(() => import('@/components/pages/Factorization').then(m => ({ default: m.Factorization })));
const CipherTools = lazy(() => import('@/components/pages/CipherTools').then(m => ({ default: m.CipherTools })));
const ECDSAWorkflow = lazy(() => import('@/components/pages/ECDSAWorkflow').then(m => ({ default: m.ECDSAWorkflow })));
const PaillierWorkflow = lazy(() => import('@/components/pages/PaillierWorkflow').then(m => ({ default: m.PaillierWorkflow })));
const ElGamalWorkflow = lazy(() => import('@/components/pages/ElGamalWorkflow').then(m => ({ default: m.ElGamalWorkflow })));
const RSAAttackWorkflow = lazy(() => import('@/components/pages/RSAAttackWorkflow').then(m => ({ default: m.RSAAttackWorkflow })));
const SubstitutionAnalysis = lazy(() => import('@/components/pages/SubstitutionAnalysis').then(m => ({ default: m.SubstitutionAnalysis })));
const DHWorkflow = lazy(() => import('@/components/pages/DHWorkflow').then(m => ({ default: m.DHWorkflow })));
const AESWorkflow = lazy(() => import('@/components/pages/AESWorkflow').then(m => ({ default: m.AESWorkflow })));
const NonceReuseAttack = lazy(() => import('@/components/pages/NonceReuseAttack').then(m => ({ default: m.NonceReuseAttack })));
const LWEWorkflow = lazy(() => import('@/components/pages/LWEWorkflow').then(m => ({ default: m.LWEWorkflow })));
const SchnorrZKP = lazy(() => import('@/components/pages/SchnorrZKP').then(m => ({ default: m.SchnorrZKP })));
const AESGCMWorkflow = lazy(() => import('@/components/pages/AESGCMWorkflow').then(m => ({ default: m.AESGCMWorkflow })));
const Argon2Workflow = lazy(() => import('@/components/pages/Argon2Workflow').then(m => ({ default: m.Argon2Workflow })));
const TLS13Workflow = lazy(() => import('@/components/pages/TLS13Workflow').then(m => ({ default: m.TLS13Workflow })));
const ShamirSSS = lazy(() => import('@/components/pages/ShamirSSS').then(m => ({ default: m.ShamirSSS })));
const PaddingOracleAttack = lazy(() => import('@/components/pages/PaddingOracleAttack').then(m => ({ default: m.PaddingOracleAttack })));
const TextbookRSAAttack = lazy(() => import('@/components/pages/TextbookRSAAttack').then(m => ({ default: m.TextbookRSAAttack })));
const HashExtensionAttack = lazy(() => import('@/components/pages/HashExtensionAttack').then(m => ({ default: m.HashExtensionAttack })));
const GCMNonceReuse = lazy(() => import('@/components/pages/GCMNonceReuse').then(m => ({ default: m.GCMNonceReuse })));
const HMACWalkthrough = lazy(() => import('@/components/pages/HMACWalkthrough').then(m => ({ default: m.HMACWalkthrough })));
const ECBPenguin = lazy(() => import('@/components/pages/ECBPenguin').then(m => ({ default: m.ECBPenguin })));
const DHSubgroupAttack = lazy(() => import('@/components/pages/DHSubgroupAttack').then(m => ({ default: m.DHSubgroupAttack })));
const WienerAttack = lazy(() => import('@/components/pages/WienerAttack').then(m => ({ default: m.WienerAttack })));
const CurvePlot = lazy(() => import('@/components/pages/CurvePlot').then(m => ({ default: m.CurvePlot })));
const BleichenbacherAttack = lazy(() => import('@/components/pages/BleichenbacherAttack').then(m => ({ default: m.BleichenbacherAttack })));
const CoppersmithAttack = lazy(() => import('@/components/pages/CoppersmithAttack').then(m => ({ default: m.CoppersmithAttack })));
const CRTFaultAttack = lazy(() => import('@/components/pages/CRTFaultAttack').then(m => ({ default: m.CRTFaultAttack })));
const BirthdayCollision = lazy(() => import('@/components/pages/BirthdayCollision').then(m => ({ default: m.BirthdayCollision })));
const ConstantTimeDemo = lazy(() => import('@/components/pages/ConstantTimeDemo').then(m => ({ default: m.ConstantTimeDemo })));
const LLLVisualization = lazy(() => import('@/components/pages/LLLVisualization').then(m => ({ default: m.LLLVisualization })));
const MeetInTheMiddle = lazy(() => import('@/components/pages/MeetInTheMiddle').then(m => ({ default: m.MeetInTheMiddle })));

export type Page =
  | 'home'
  | 'ec-calculator'
  | 'rsa'
  | 'modular'
  | 'converter'
  | 'factorization'
  | 'ciphers'
  | 'ecdsa'
  | 'paillier'
  | 'elgamal'
  | 'rsa-attack'
  | 'substitution'
  | 'diffie-hellman'
  | 'aes'
  | 'nonce-reuse'
  | 'lwe'
  | 'schnorr'
  | 'aes-gcm'
  | 'argon2'
  | 'tls13'
  | 'padding-oracle'
  | 'textbook-rsa'
  | 'hash-extension'
  | 'shamir'
  | 'gcm-nonce'
  | 'hmac'
  | 'ecb-penguin'
  | 'dh-subgroup'
  | 'wiener'
  | 'curve-plot'
  | 'bleichenbacher'
  | 'coppersmith'
  | 'crt-fault'
  | 'birthday'
  | 'constant-time'
  | 'lll'
  | 'mitm';

const PAGE_COMPONENTS: Record<Page, React.FC> = {
  home: () => null, // handled separately in render
  'ec-calculator': ECCalculator,
  rsa: RSACalculator,
  modular: ModularArithmetic,
  converter: BaseConverter,
  factorization: Factorization,
  ciphers: CipherTools,
  ecdsa: ECDSAWorkflow,
  paillier: PaillierWorkflow,
  elgamal: ElGamalWorkflow,
  'rsa-attack': RSAAttackWorkflow,
  substitution: SubstitutionAnalysis,
  'diffie-hellman': DHWorkflow,
  aes: AESWorkflow,
  'nonce-reuse': NonceReuseAttack,
  lwe: LWEWorkflow,
  schnorr: SchnorrZKP,
  'aes-gcm': AESGCMWorkflow,
  argon2: Argon2Workflow,
  tls13: TLS13Workflow,
  'padding-oracle': PaddingOracleAttack,
  'textbook-rsa': TextbookRSAAttack,
  'hash-extension': HashExtensionAttack,
  shamir: ShamirSSS,
  'gcm-nonce': GCMNonceReuse,
  hmac: HMACWalkthrough,
  'ecb-penguin': ECBPenguin,
  'dh-subgroup': DHSubgroupAttack,
  wiener: WienerAttack,
  'curve-plot': CurvePlot,
  bleichenbacher: BleichenbacherAttack,
  coppersmith: CoppersmithAttack,
  'crt-fault': CRTFaultAttack,
  birthday: BirthdayCollision,
  'constant-time': ConstantTimeDemo,
  lll: LLLVisualization,
  mitm: MeetInTheMiddle,
};

const PAGE_TITLES: Record<Page, string> = {
  home: 'CryptoToolkit',
  'ec-calculator': 'Elliptic Curve Calculator',
  rsa: 'RSA Key Generator',
  modular: 'Modular Arithmetic',
  converter: 'Base & Text Converter',
  factorization: 'Integer Factorization',
  ciphers: 'Cipher Tools',
  ecdsa: 'ECDSA Signing Workflow',
  paillier: 'Paillier Cryptosystem',
  elgamal: 'ElGamal Cryptosystem',
  'rsa-attack': 'RSA Attack Workflow',
  substitution: 'Substitution Analysis',
  'diffie-hellman': 'Diffie-Hellman Key Exchange',
  aes: 'AES-128 Round Visualization',
  'nonce-reuse': 'ECDSA Nonce Reuse Attack',
  lwe: 'Lattice (LWE) Encryption',
  schnorr: 'Schnorr ZKP Protocol',
  'aes-gcm': 'AES-GCM Authenticated Encryption',
  argon2: 'Argon2id Key Derivation',
  tls13: 'TLS 1.3 Handshake',
  'padding-oracle': 'Padding Oracle Attack',
  'textbook-rsa': 'Textbook RSA Attack',
  'hash-extension': 'Hash Length Extension Attack',
  shamir: 'Shamir Secret Sharing',
  'gcm-nonce': 'GCM Nonce Reuse Attack',
  hmac: 'HMAC-SHA256 Walkthrough',
  'ecb-penguin': 'ECB Pattern Leakage',
  'dh-subgroup': 'DH Small Subgroup Attack',
  wiener: "Wiener's RSA Attack",
  'curve-plot': 'EC Curve Visualization',
  bleichenbacher: 'Bleichenbacher RSA Attack',
  coppersmith: 'Hastad Broadcast Attack (e=3)',
  'crt-fault': 'CRT-RSA Fault Injection',
  birthday: 'Birthday Collision Finder',
  'constant-time': 'Constant-Time Comparison',
  lll: 'LLL Lattice Reduction',
  mitm: 'Meet-in-the-Middle Attack',
};

// Tracks viewport width and invokes onMobile whenever the viewport transitions
// into mobile range. Consolidating this into the hook avoids a setState-in-effect
// in the consuming component (flagged by react-hooks/set-state-in-effect).
function useIsMobile(onEnterMobile?: () => void) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => {
      const next = window.innerWidth < 768;
      setIsMobile(prev => {
        if (next && !prev) onEnterMobile?.();
        return next;
      });
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [onEnterMobile]);
  return isMobile;
}

// Set of valid page ids for safe hash → Page coercion.
const VALID_PAGES = new Set(Object.keys({
  home: 0, 'ec-calculator': 0, rsa: 0, modular: 0, converter: 0, factorization: 0,
  ciphers: 0, ecdsa: 0, paillier: 0, elgamal: 0, 'rsa-attack': 0, substitution: 0,
  'diffie-hellman': 0, aes: 0, 'nonce-reuse': 0, lwe: 0, schnorr: 0, 'aes-gcm': 0,
  argon2: 0, tls13: 0, 'padding-oracle': 0, 'textbook-rsa': 0, 'hash-extension': 0,
  shamir: 0, 'gcm-nonce': 0, hmac: 0, 'ecb-penguin': 0, 'dh-subgroup': 0, wiener: 0,
  'curve-plot': 0, bleichenbacher: 0, coppersmith: 0, 'crt-fault': 0, birthday: 0,
  'constant-time': 0, lll: 0, mitm: 0,
} satisfies Record<Page, number>));

function pageFromHash(): Page {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (VALID_PAGES.has(raw) ? raw : 'home') as Page;
}

function ProjectFeedback({ page }: { page: Page }) {
  const title = PAGE_TITLES[page];
  const url = page === 'home'
    ? 'https://ctool.mdpstudio.com.au'
    : `https://ctool.mdpstudio.com.au/#/${page}`;
  const subject = encodeURIComponent(`Feedback: CryptoToolkit - ${title}`);
  const body = encodeURIComponent(
    `Project: CryptoToolkit\nModule/page: ${title}\nLink: ${url}\nWhat happened:\nWhat you expected:\n\nPlease do not include passwords, API keys, private data, client data, or payment details.`
  );

  return (
    <Card className="mt-6 border-primary/10 bg-primary/5">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary mb-2">Project feedback</div>
            <h2 className="text-base font-semibold">Found a bug, confusing step, or improvement idea?</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Send the module name, what happened, and what you expected so I can reproduce it cleanly.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Do not include passwords, API keys, private data, client data, or payment details.
            </p>
          </div>
          <a
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            href={`mailto:meidie@mdpstudio.com.au?subject=${subject}&body=${body}`}
          >
            Send feedback
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [page, setPageState] = useState<Page>(() => pageFromHash());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile(() => setSidebarOpen(false));
  const PageComponent = PAGE_COMPONENTS[page];

  // Keep URL hash in sync with page state (bookmarkable state)
  const setPage = (next: Page) => {
    const hash = next === 'home' ? '' : `#/${next}`;
    if (window.location.hash !== hash) {
      // Using replaceState here would flatten history; pushState preserves back/forward.
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    }
    setPageState(next);
  };

  // Browser back/forward updates state to match the hash
  useEffect(() => {
    const handler = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
    };
  }, []);

  return (
    <TooltipProvider>
      {/* Skip link for keyboard users — visible only when focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div className="flex h-screen overflow-hidden bg-background">
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 py-3 gap-2">
            <button
              onClick={() => setPage('home')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-[10px]">CT</span>
              </div>
              <span className="text-sm md:text-base font-semibold tracking-tight truncate">
                {page === 'home' ? 'CryptoToolkit' : PAGE_TITLES[page]}
              </span>
            </button>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground shrink-0"
                aria-label="Toggle sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
            </div>
          </header>
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <SecurityBanner />
            <ErrorBoundary resetKey={page}>
              {page === 'home' ? (
                <Home onNavigate={setPage} />
              ) : (
                <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading...</div>}>
                  <PageComponent />
                </Suspense>
              )}
            </ErrorBoundary>
            <ProjectFeedback page={page} />
          </div>
        </main>
        <Sidebar
          currentPage={page}
          onPageChange={setPage}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />
      </div>
    </TooltipProvider>
  );
}
