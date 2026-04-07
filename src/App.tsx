import { useState, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { ECCalculator } from '@/components/pages/ECCalculator';
import { RSACalculator } from '@/components/pages/RSACalculator';
import { ModularArithmetic } from '@/components/pages/ModularArithmetic';
import { BaseConverter } from '@/components/pages/BaseConverter';
import { Factorization } from '@/components/pages/Factorization';
import { CipherTools } from '@/components/pages/CipherTools';
import { ECDSAWorkflow } from '@/components/pages/ECDSAWorkflow';
import { PaillierWorkflow } from '@/components/pages/PaillierWorkflow';
import { ElGamalWorkflow } from '@/components/pages/ElGamalWorkflow';
import { RSAAttackWorkflow } from '@/components/pages/RSAAttackWorkflow';
import { SubstitutionAnalysis } from '@/components/pages/SubstitutionAnalysis';
import { DHWorkflow } from '@/components/pages/DHWorkflow';
import { AESWorkflow } from '@/components/pages/AESWorkflow';
import { NonceReuseAttack } from '@/components/pages/NonceReuseAttack';
import { LWEWorkflow } from '@/components/pages/LWEWorkflow';
import { SchnorrZKP } from '@/components/pages/SchnorrZKP';
import { AESGCMWorkflow } from '@/components/pages/AESGCMWorkflow';
import { Argon2Workflow } from '@/components/pages/Argon2Workflow';
import { TLS13Workflow } from '@/components/pages/TLS13Workflow';
import { ShamirSSS } from '@/components/pages/ShamirSSS';
import { PaddingOracleAttack } from '@/components/pages/PaddingOracleAttack';
import { TextbookRSAAttack } from '@/components/pages/TextbookRSAAttack';
import { HashExtensionAttack } from '@/components/pages/HashExtensionAttack';
import { GCMNonceReuse } from '@/components/pages/GCMNonceReuse';
import { HMACWalkthrough } from '@/components/pages/HMACWalkthrough';
import { ECBPenguin } from '@/components/pages/ECBPenguin';
import { DHSubgroupAttack } from '@/components/pages/DHSubgroupAttack';
import { WienerAttack } from '@/components/pages/WienerAttack';
import { CurvePlot } from '@/components/pages/CurvePlot';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SecurityBanner } from '@/components/SecurityBanner';

export type Page =
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
  | 'curve-plot';

const PAGE_COMPONENTS: Record<Page, React.FC> = {
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
};

const PAGE_TITLES: Record<Page, string> = {
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
  const [page, setPage] = useState<Page>('ec-calculator');
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
            <PageComponent />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
