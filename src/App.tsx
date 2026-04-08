import { useState, useEffect, lazy, Suspense } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  | 'constant-time';

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
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const PageComponent = PAGE_COMPONENTS[page];

  // Auto-close sidebar when switching to mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          currentPage={page}
          onPageChange={setPage}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />
        <main className="flex-1 overflow-auto min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 py-3 gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {(!sidebarOpen || isMobile) && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground shrink-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                </button>
              )}
              <h1 className="text-base md:text-xl font-semibold tracking-tight truncate">{PAGE_TITLES[page]}</h1>
            </div>
            <ThemeToggle />
          </header>
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <SecurityBanner />
            <ErrorBoundary>
              {page === 'home' ? (
                <Home onNavigate={setPage} />
              ) : (
                <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading...</div>}>
                  <PageComponent />
                </Suspense>
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
