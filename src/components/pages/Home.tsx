import { Card, CardContent } from '@/components/ui/card';
import type { Page } from '@/App';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const CATEGORIES: { name: string; icon: string; accent: string; bg: string; pages: { id: Page; label: string; desc: string }[] }[] = [
  {
    name: 'Cryptography',
    icon: '🔐',
    accent: 'text-blue-400',
    bg: 'hover:bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30',
    pages: [
      { id: 'ec-calculator', label: 'Elliptic Curves', desc: 'Point addition, scalar multiply' },
      { id: 'rsa', label: 'RSA Generator', desc: 'Key generation, encrypt/decrypt' },
      { id: 'ciphers', label: 'Cipher Tools', desc: 'Caesar, Vigenere, ROT13' },
    ],
  },
  {
    name: 'Number Theory',
    icon: '🔢',
    accent: 'text-purple-400',
    bg: 'hover:bg-purple-500/5 border-purple-500/10 hover:border-purple-500/30',
    pages: [
      { id: 'modular', label: 'Modular Arithmetic', desc: 'Inverse, GCD, totient, primality' },
      { id: 'factorization', label: 'Factorization', desc: 'Prime factorization' },
    ],
  },
  {
    name: 'Workflows',
    icon: '⚡',
    accent: 'text-green-400',
    bg: 'hover:bg-green-500/5 border-green-500/10 hover:border-green-500/30',
    pages: [
      { id: 'ecdsa', label: 'ECDSA Signing', desc: 'Hash → sign → verify' },
      { id: 'paillier', label: 'Paillier', desc: 'Homomorphic encryption' },
      { id: 'elgamal', label: 'ElGamal', desc: 'Homomorphic multiply' },
      { id: 'diffie-hellman', label: 'Diffie-Hellman', desc: 'Key exchange' },
      { id: 'aes', label: 'AES Round', desc: 'State matrix transforms' },
      { id: 'shamir', label: 'Shamir SSS', desc: 'Secret sharing' },
    ],
  },
  {
    name: 'Composition',
    icon: '🔗',
    accent: 'text-orange-400',
    bg: 'hover:bg-orange-500/5 border-orange-500/10 hover:border-orange-500/30',
    pages: [
      { id: 'aes-gcm', label: 'AES-GCM', desc: 'Authenticated encryption' },
      { id: 'argon2', label: 'Argon2id', desc: 'Memory-hard hashing' },
      { id: 'tls13', label: 'TLS 1.3', desc: 'Full handshake simulation' },
      { id: 'hmac', label: 'HMAC', desc: 'Step-by-step walkthrough' },
    ],
  },
  {
    name: 'Attacks',
    icon: '💀',
    accent: 'text-red-400',
    bg: 'hover:bg-red-500/5 border-red-500/10 hover:border-red-500/30',
    pages: [
      { id: 'nonce-reuse', label: 'ECDSA Nonce Reuse', desc: 'Private key extraction' },
      { id: 'gcm-nonce', label: 'GCM Nonce Reuse', desc: 'Plaintext XOR leak' },
      { id: 'padding-oracle', label: 'Padding Oracle', desc: 'CBC byte-by-byte' },
      { id: 'textbook-rsa', label: 'Textbook RSA', desc: 'Ciphertext malleability' },
      { id: 'hash-extension', label: 'Hash Extension', desc: 'Merkle-Damgard exploit' },
      { id: 'rsa-attack', label: 'RSA Factoring', desc: 'Factor n → recover d' },
      { id: 'wiener', label: "Wiener's Attack", desc: 'Continued fractions' },
      { id: 'bleichenbacher', label: 'Bleichenbacher', desc: 'PKCS#1 v1.5 oracle' },
      { id: 'coppersmith', label: 'Hastad Broadcast', desc: 'CRT + cube root' },
      { id: 'crt-fault', label: 'CRT Fault', desc: 'Fault injection' },
      { id: 'dh-subgroup', label: 'DH Subgroup', desc: 'Small-order attack' },
      { id: 'ecb-penguin', label: 'ECB Penguin', desc: 'Pattern leakage' },
    ],
  },
  {
    name: 'Advanced',
    icon: '🧬',
    accent: 'text-cyan-400',
    bg: 'hover:bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/30',
    pages: [
      { id: 'lwe', label: 'Lattice (LWE)', desc: 'Post-quantum encryption' },
      { id: 'schnorr', label: 'Schnorr ZKP', desc: 'Zero-knowledge proof' },
      { id: 'birthday', label: 'Birthday Collision', desc: 'Hash collision finder' },
      { id: 'constant-time', label: 'Constant-Time', desc: 'Timing attack demo' },
    ],
  },
  {
    name: 'Utilities',
    icon: '🛠',
    accent: 'text-gray-400',
    bg: 'hover:bg-gray-500/5 border-gray-500/10 hover:border-gray-500/30',
    pages: [
      { id: 'converter', label: 'Base & Encoding', desc: 'SHA hash, hex, base64' },
      { id: 'substitution', label: 'Substitution Analysis', desc: 'Cipher breaker' },
      { id: 'curve-plot', label: 'EC Curve Plot', desc: 'F_p scatter plot' },
    ],
  },
];

export function Home({ onNavigate }: HomeProps) {
  const totalPages = CATEGORIES.reduce((sum, cat) => sum + cat.pages.length, 0);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/10 px-6 py-10 md:py-14 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-medium text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {totalPages} Interactive Modules
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            CryptoToolkit
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            An educational platform for applied cryptography. From elliptic curves to TLS 1.3 handshakes,
            from AES internals to post-quantum lattice encryption.
          </p>
          <div className="flex justify-center gap-3 flex-wrap pt-2">
            {['Client-Side BigInt', 'Web Crypto API', 'WASM Argon2id', 'Code-Split'].map(tag => (
              <span key={tag} className="text-[10px] font-mono text-muted-foreground/60 bg-muted/50 rounded px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => (
          <Card key={cat.name} className={`${cat.bg} transition-all duration-200 group`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{cat.icon}</span>
                <h3 className={`text-sm font-semibold ${cat.accent}`}>{cat.name}</h3>
                <span className="text-[10px] text-muted-foreground/50 ml-auto">{cat.pages.length}</span>
              </div>
              <div className="space-y-0.5">
                {cat.pages.map(pg => (
                  <button
                    key={pg.id}
                    onClick={() => onNavigate(pg.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-background/80 transition-all group/item flex items-baseline gap-2"
                  >
                    <span className="text-sm font-medium group-hover/item:text-primary transition-colors leading-tight">{pg.label}</span>
                    <span className="text-[11px] text-muted-foreground/50 leading-tight hidden sm:inline">{pg.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
