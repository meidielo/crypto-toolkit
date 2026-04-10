# CryptoToolkit

An interactive educational cryptography platform with 35 modules covering symmetric encryption, asymmetric cryptography, post-quantum lattice encryption, protocol composition, and implementation attacks. All computation runs client-side using BigInt arithmetic with `crypto.getRandomValues()` (CSPRNG) — no server required.

**Live:** [ctool.mdpstudio.com.au](https://ctool.mdpstudio.com.au)

## Modules (35 pages)

### Cryptography
- **Elliptic Curve Calculator** — Point addition, scalar multiply, points table, preset curves (secp256k1, P-192, P-256). Parameter contradiction validation.
- **RSA Key Generator** — 16-2048 bit key generation, manual key computation, encrypt/decrypt. Web Crypto comparison.
- **Cipher Tools** — Caesar (encrypt/decrypt/brute force), Vigenere, ROT13, Atbash, frequency analysis.

### Number Theory
- **Modular Arithmetic** — Mod inverse, mod exponentiation, GCD/extended GCD, Euler's totient, sqrt mod p (Tonelli-Shanks), Legendre symbol, Miller-Rabin primality.
- **Integer Factorization** — Prime factorization, totient, divisor count, next prime, prime listing up to 100,000.

### Workflows
- **ECDSA Signing** — Hash → sign → verify with nonce uniqueness warnings and RFC 6979 explanation.
- **Paillier** — Additive homomorphic encryption: keygen, encrypt, homomorphic addition, decrypt.
- **ElGamal** — Exponential ElGamal with homomorphic multiply and bounded discrete log.
- **Diffie-Hellman** — Step-by-step key exchange with shared secret derivation.
- **AES-128 Round** — SubBytes, ShiftRows (CSS animated), MixColumns (GF(2^8) detail), AddRoundKey. FIPS 197 vectors.
- **Shamir Secret Sharing** — Polynomial split, Lagrange interpolation, threshold demo.

### Protocol Composition
- **AES-GCM** — CTR stream cipher + GHASH polynomial authentication over GF(2^128). Web Crypto comparison.
- **Argon2id** — Memory-hard password hashing via WASM Web Worker. SHA-256 timing comparison, OWASP presets.
- **TLS 1.3 Handshake** — ECDHE → HKDF → ECDSA (real crypto.subtle) → AES-GCM encrypted application data.
- **HMAC-SHA256** — Step-by-step ipad/opad XOR, inner/outer hash with Web Crypto verification.

### Attacks (12 pages)
- **ECDSA Nonce Reuse** — Extract private key from two signatures with same k. PS3 incident context.
- **GCM Nonce Reuse** — XOR ciphertexts to leak plaintext relationship + authentication key H.
- **Padding Oracle** — Real AES-CBC inverse cipher decryption, byte-by-byte PKCS#7 recovery.
- **Textbook RSA** — Ciphertext malleability via multiplicative homomorphism.
- **Hash Length Extension** — Custom SHA-256 with exposed internal state. Real Merkle-Damgard exploit (not simulation).
- **RSA Factoring** — Trial division from sqrt(n), recover d, decrypt, verify.
- **Wiener's Attack** — Continued fraction expansion of e/n recovers small private key d.
- **Bleichenbacher** — PKCS#1 v1.5 padding oracle with interval narrowing.
- **Hastad Broadcast** — CRT + integer cube root for e=3.
- **CRT-RSA Fault Injection** — Single bit flip during CRT signing reveals p via GCD.
- **DH Small Subgroup** — Malicious generators leak secret mod small order, CRT combination.
- **ECB Penguin** — Color-coded block visualization showing pattern leakage.

### Advanced
- **Lattice (LWE)** — Post-quantum encryption with error analysis and brute-force scaling table.
- **Schnorr ZKP** — Interactive zero-knowledge proof with cheating prover mode (soundness demo).
- **Birthday Collision** — Truncated SHA-256 collision finder with sqrt(N) scaling.
- **Constant-Time Comparison** — Early-exit vs XOR-based string comparison with timing measurements.

### Utilities
- **Base & Encoding** — SHA-1/SHA-256 hashing (LF/CRLF aware), text↔hex/binary/decimal/base64, base conversion.
- **Substitution Analysis** — Interactive cipher breaker with frequency/digraph/trigraph analysis.
- **EC Curve Plot** — Scatter plot of all F_p points for small primes with interactive selection.

## Tech Stack

- **React 19** + **Vite 8** — Code-split with React.lazy (main bundle 217KB → 65KB gzipped)
- **TypeScript 5.9** — Strict mode with noUnusedLocals
- **Tailwind CSS v4** + **shadcn/ui** — Dark/light theme, responsive 320px-1280px+
- **Vitest** — 66 tests covering AES, SHA-256, EC math, number theory, RSA, Bleichenbacher, parsing
- **BigInt** — Arbitrary precision, no external math libraries
- **Web Crypto API** — CSPRNG, constant-time ECDSA/AES/RSA comparison
- **hash-wasm** — Argon2id WASM in dedicated Web Worker
- **ESLint** — `Math.random` banned via `no-restricted-properties`

## Getting Started

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build
npm test         # 66 tests
```

## Architecture

```
src/
  lib/
    ec-math.ts         # EC operations, Montgomery ladder, baby-step giant-step ECDLP
    crypto-math.ts     # RSA, primality, factorization, ciphers, Paillier, discrete log
    aes-math.ts        # AES encrypt/decrypt (FIPS 197), CTR, GCM, GHASH, GF(2^8/2^128)
    sha256.ts          # Custom SHA-256 with exposed internal state (for hash extension)
    lwe-math.ts        # LWE key generation, encrypt, decrypt
    web-crypto.ts      # HMAC, HKDF, AES-GCM, ECDH, ECDSA via crypto.subtle
    parse.ts           # Shared BigInt parsing with 2000-char length guard
    utils.ts           # UI utility (cn)
  hooks/
    useCryptoWorker.ts    # Web Worker with stale response guard (latestIdRef)
    useDebouncedCompute.ts # 300ms debounce for input-triggered computation
    useStepMachine.ts     # Deterministic FSM (ADVANCE/INVALIDATE/SET_INPUT)
  workers/
    crypto.worker.ts      # General math worker with BigInt serialization
    hash.worker.ts        # Dedicated Argon2id WASM worker (loads once, reuses)
  components/
    Sidebar.tsx           # Right-side collapsible nav with category toggles
    ErrorBoundary.tsx     # Catches computation errors without crashing app
    SecurityBanner.tsx    # Collapsible timing attack warning
    StepCard.tsx          # Step-by-step workflow card
    ShiftRowsAnimation.tsx # CSS transform animation for AES ShiftRows
    pages/                # 35 lazy-loaded page components
  __tests__/
    crypto.test.ts        # AES, SHA-256, EC math, number theory test vectors
```

## Security Headers (Deployment)

Configured for Netlify (`public/_headers`) and Vercel (`vercel.json`):
- `Content-Security-Policy: script-src 'self'; frame-ancestors 'none'`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `X-Frame-Options: DENY` / `X-Content-Type-Options: nosniff`
- `Cache-Control: no-cache` for index.html, `immutable` for hashed assets

## License

MIT
