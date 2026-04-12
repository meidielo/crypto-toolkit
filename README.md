# CryptoToolkit

An interactive educational cryptography platform with 37 modules covering symmetric encryption, asymmetric cryptography, post-quantum lattice encryption, protocol composition, and implementation attacks. All computation runs client-side using BigInt arithmetic with `crypto.getRandomValues()` (CSPRNG) — no server required.

**Live:** [ctool.mdpstudio.com.au](https://ctool.mdpstudio.com.au)

## Modules (37 pages)

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
- **LLL Lattice Reduction** — 2D Gram-Schmidt orthogonalization visualization with Lovász condition.
- **Meet-in-the-Middle** — S-DES double encryption key recovery in O(2^n) vs O(2^2n) brute force.

### Utilities
- **Base & Encoding** — SHA-1/SHA-256 hashing (LF/CRLF aware), text↔hex/binary/decimal/base64, base conversion.
- **Substitution Analysis** — Interactive cipher breaker with frequency/digraph/trigraph analysis.
- **EC Curve Plot** — Scatter plot of all F_p points for small primes with interactive selection.

## Tech Stack

- **React 19** + **Vite 8** — Code-split with React.lazy (main bundle 220KB, 67KB gzipped)
- **TypeScript 5.9** — Strict mode with noUnusedLocals, verbatimModuleSyntax
- **Tailwind CSS v4** + **shadcn/ui** — Dark/light theme, responsive 320px-1280px+
- **Vitest** — 95 tests covering AES, SHA-256, EC math, number theory, RSA, LWE, Shamir, Bleichenbacher, parsing
- **BigInt** — Arbitrary precision, no external math libraries
- **Web Crypto API** — CSPRNG, constant-time ECDSA/AES/RSA comparison
- **hash-wasm** — Argon2id WASM in dedicated Web Worker
- **ESLint** — `Math.random` banned via `no-restricted-properties`

## Getting Started

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build
npm test         # 95 tests
npm run ci       # full check: tsc + lint + test
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
    useDebouncedValue.ts  # 300ms debounce for input-triggered computation
  workers/
    crypto.worker.ts      # RSA keygen worker with BigInt serialization
    hash.worker.ts        # Dedicated Argon2id WASM worker (loads once, reuses)
  components/
    Sidebar.tsx           # Right-side collapsible nav with category toggles
    ErrorBoundary.tsx     # Catches computation errors without crashing app
    SecurityBanner.tsx    # Collapsible timing attack warning
    StepCard.tsx          # Step-by-step workflow card
    ShiftRowsAnimation.tsx # CSS transform animation for AES ShiftRows
    pages/                # 37 lazy-loaded page components
  __tests__/
    crypto.test.ts        # AES, SHA-256, EC math, number theory, LWE test vectors
```

## Design Decisions

**Custom SHA-256 instead of Web Crypto.** `crypto.subtle.digest` doesn't expose internal state. The hash length extension attack requires setting a custom initial hash value (the attacker-known MAC output) and resuming from an arbitrary midpoint — impossible with a sealed API. Built a from-scratch FIPS 180-4 implementation with `getState()` / `resume()` to make the Merkle-Damgard vulnerability tangible.

**Real attacks, not simulations.** Every attack page computes the actual exploit. Bleichenbacher's padding oracle does genuine interval narrowing across multiple iterations — the recovered plaintext is the output of the algorithm, not a pre-known value revealed with animation. The CLAUDE.md audit rules enforce this: "if the attack doesn't actually recover the secret through the algorithmic process, label it clearly as a simulation."

**BigInt arithmetic with known limitations.** GHASH length encoding uses 32-bit JS bitwise ops (correct for inputs < 268MB, documented). `generateRandomPrime` uses `nextPrime(random)` which biases toward primes after large gaps (documented with FIPS 186-5 reference). Miller-Rabin uses 12 fixed witnesses + CSPRNG extras above the deterministic threshold of 3.3×10²⁴. These are deliberate scope boundaries for an educational tool, not oversights.

**RSA keygen in a Web Worker.** Generating 2048-bit keys requires iterative primality testing that blocks the main thread for 1-5 seconds. Moved to `crypto.worker.ts` with a stale-response guard (`genIdRef`) so rapid re-generation doesn't apply an outdated result.

## Security Headers (Deployment)

Configured for Netlify (`public/_headers`) and Vercel (`vercel.json`):
- `Content-Security-Policy: script-src 'self'; frame-ancestors 'none'`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `X-Frame-Options: DENY` / `X-Content-Type-Options: nosniff`
- `Cache-Control: no-cache` for index.html, `immutable` for hashed assets

## License

MIT
