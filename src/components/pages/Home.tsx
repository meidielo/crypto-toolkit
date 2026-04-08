import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Page } from '@/App';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const CATEGORIES: { name: string; description: string; color: string; pages: { id: Page; label: string; desc: string }[] }[] = [
  {
    name: 'Cryptography',
    description: 'Core encryption and key generation tools',
    color: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
    pages: [
      { id: 'ec-calculator', label: 'Elliptic Curves', desc: 'Point addition, scalar multiply, preset curves' },
      { id: 'rsa', label: 'RSA Generator', desc: 'Key generation, encrypt/decrypt' },
      { id: 'ciphers', label: 'Cipher Tools', desc: 'Caesar, Vigenere, ROT13, frequency analysis' },
    ],
  },
  {
    name: 'Number Theory',
    description: 'Mathematical foundations',
    color: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
    pages: [
      { id: 'modular', label: 'Modular Arithmetic', desc: 'Inverse, exponentiation, GCD, totient, primality' },
      { id: 'factorization', label: 'Factorization', desc: 'Prime factorization, prime listing' },
    ],
  },
  {
    name: 'Workflows',
    description: 'Step-by-step cryptographic protocols',
    color: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
    pages: [
      { id: 'ecdsa', label: 'ECDSA Signing', desc: 'Hash, sign, verify with nonce warnings' },
      { id: 'paillier', label: 'Paillier', desc: 'Homomorphic encryption workflow' },
      { id: 'elgamal', label: 'ElGamal', desc: 'Exponential ElGamal with homomorphic multiply' },
      { id: 'diffie-hellman', label: 'Diffie-Hellman', desc: 'Key exchange step-by-step' },
      { id: 'aes', label: 'AES Round', desc: 'SubBytes, ShiftRows, MixColumns, AddRoundKey' },
      { id: 'shamir', label: 'Shamir SSS', desc: 'Secret sharing with Lagrange interpolation' },
    ],
  },
  {
    name: 'Composition',
    description: 'How primitives combine into real protocols',
    color: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
    pages: [
      { id: 'aes-gcm', label: 'AES-GCM', desc: 'CTR + GHASH authenticated encryption' },
      { id: 'argon2', label: 'Argon2id', desc: 'Memory-hard password hashing (WASM)' },
      { id: 'tls13', label: 'TLS 1.3', desc: 'Full handshake: ECDHE → HKDF → ECDSA → AES-GCM' },
      { id: 'hmac', label: 'HMAC', desc: 'Step-by-step HMAC-SHA256 with Web Crypto verify' },
    ],
  },
  {
    name: 'Attacks',
    description: 'Implementation vulnerabilities and exploits',
    color: 'bg-red-500/10 border-red-500/20 hover:border-red-500/40',
    pages: [
      { id: 'nonce-reuse', label: 'ECDSA Nonce Reuse', desc: 'Extract private key from reused k' },
      { id: 'gcm-nonce', label: 'GCM Nonce Reuse', desc: 'Plaintext XOR + auth key leak' },
      { id: 'padding-oracle', label: 'Padding Oracle', desc: 'AES-CBC byte-by-byte recovery' },
      { id: 'textbook-rsa', label: 'Textbook RSA', desc: 'Ciphertext malleability' },
      { id: 'hash-extension', label: 'Hash Extension', desc: 'SHA-256 Merkle-Damgard exploit' },
      { id: 'rsa-attack', label: 'RSA Factoring', desc: 'Factor n, recover private key' },
      { id: 'wiener', label: "Wiener's Attack", desc: 'Continued fractions on small d' },
      { id: 'bleichenbacher', label: 'Bleichenbacher', desc: 'PKCS#1 v1.5 oracle' },
      { id: 'coppersmith', label: 'Hastad Broadcast', desc: 'CRT + cube root (e=3)' },
      { id: 'crt-fault', label: 'CRT Fault', desc: 'Bit flip during CRT-RSA signing' },
      { id: 'dh-subgroup', label: 'DH Subgroup', desc: 'Small-order element attack' },
      { id: 'ecb-penguin', label: 'ECB Penguin', desc: 'Pattern leakage in ECB mode' },
    ],
  },
  {
    name: 'Advanced',
    description: 'Post-quantum, zero-knowledge, and analysis tools',
    color: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
    pages: [
      { id: 'lwe', label: 'Lattice (LWE)', desc: 'Post-quantum encryption with error analysis' },
      { id: 'schnorr', label: 'Schnorr ZKP', desc: 'Interactive zero-knowledge proof' },
      { id: 'birthday', label: 'Birthday Collision', desc: 'Truncated SHA-256 collision finder' },
      { id: 'constant-time', label: 'Constant-Time', desc: 'Timing attack comparison demo' },
    ],
  },
  {
    name: 'Utilities',
    description: 'Encoding, hashing, and visualization',
    color: 'bg-gray-500/10 border-gray-500/20 hover:border-gray-500/40',
    pages: [
      { id: 'converter', label: 'Base & Encoding', desc: 'SHA hash, hex, binary, base64' },
      { id: 'substitution', label: 'Substitution Analysis', desc: 'Interactive cipher breaker' },
      { id: 'curve-plot', label: 'EC Curve Plot', desc: 'Scatter plot of F_p points' },
    ],
  },
];

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 py-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">CryptoToolkit</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          An interactive educational platform for applied cryptography. 35 modules covering
          symmetric, asymmetric, post-quantum, protocol composition, and implementation attacks.
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="outline">35 Pages</Badge>
          <Badge variant="outline">Client-Side BigInt</Badge>
          <Badge variant="outline">Web Crypto Comparison</Badge>
          <Badge variant="outline">WASM Argon2id</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map(cat => (
          <Card key={cat.name} className={`${cat.color} transition-colors`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{cat.name}</CardTitle>
              <CardDescription className="text-xs">{cat.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {cat.pages.map(pg => (
                  <button
                    key={pg.id}
                    onClick={() => onNavigate(pg.id)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-background/50 transition-colors group"
                  >
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{pg.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{pg.desc}</span>
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
