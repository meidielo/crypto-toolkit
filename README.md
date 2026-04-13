# CryptoToolkit

An interactive educational platform for learning cryptography by doing — 36 modules covering how crypto works, why it works, and how it breaks. Every attack is real: algorithms run to completion and recover secrets through the actual mathematical exploit, not pre-computed simulations.

All computation runs client-side using BigInt arithmetic with `crypto.getRandomValues()` — no server, no tracking, no data leaves your browser.

## Why I built this

Every time I sat down to do a cryptography assignment, I'd end up with a dozen browser tabs open — one calculator for modular arithmetic, another for EC point addition, a third for RSA key generation, and so on. And the tutorial worked examples would skip steps ("it follows that..."), leaving me to figure out what happened in between. I built CryptoToolkit to put everything in one place, showing every intermediate step so you can actually follow the math from start to finish.

> **This is a learning tool, not a production library.** These implementations are not constant-time, do not zeroize key material, and have not been formally verified. BigInt operations in JavaScript leak timing information proportional to operand size. For production use, reach for [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API), [libsodium](https://doc.libsodium.org/), or [Google Tink](https://developers.google.com/tink).

**Live:** [ctool.mdpstudio.com.au](https://ctool.mdpstudio.com.au)

## Modules (36 pages)

### Attacks (12 pages)
- **Bleichenbacher** — PKCS#1 v1.5 padding oracle with genuine interval narrowing (Steps 2a/2b/2c/3/4). Typically converges in ~10K oracle queries.
- **Padding Oracle** — Real AES-CBC inverse cipher decryption, byte-by-byte PKCS#7 recovery across all ciphertext blocks.
- **ECDSA Nonce Reuse** — Extract private key from two signatures sharing the same k. PS3 incident context.
- **GCM Nonce Reuse** — XOR ciphertexts to leak plaintext relationship + recover authentication key H.
- **Hash Length Extension** — Custom SHA-256 with exposed internal state. Real Merkle-Damgard exploit using attacker-controlled state resumption.
- **Wiener's Attack** — Continued fraction expansion of e/n recovers small private key d.
- **Hastad Broadcast** — CRT + integer cube root for e=3 (Coppersmith's theorem, simplest case).
- **CRT-RSA Fault Injection** — Single bit flip during CRT signing reveals p via GCD.
- **Textbook RSA** — Ciphertext malleability via multiplicative homomorphism.
- **RSA Factoring** — Pollard's rho + trial division, recover d, decrypt, verify.
- **DH Small Subgroup** — Malicious generators leak secret mod small order, CRT combination.
- **ECB Penguin** — Color-coded block visualization showing pattern leakage.

### Protocol Composition
- **AES-GCM** — CTR stream cipher + GHASH polynomial authentication over GF(2^128). Web Crypto comparison.
- **TLS 1.3 Handshake** — ECDHE → HKDF → ECDSA (real `crypto.subtle`) → AES-GCM encrypted application data.
- **HMAC-SHA256** — Step-by-step ipad/opad XOR, inner/outer hash with Web Crypto verification.
- **Argon2id** — Memory-hard password hashing via WASM Web Worker. SHA-256 timing comparison, OWASP presets.

### Workflows
- **ECDSA Signing** — Hash → sign → verify with nonce uniqueness warnings and RFC 6979 explanation.
- **AES-128 Round** — SubBytes, ShiftRows (CSS animated), MixColumns (GF(2^8) detail), AddRoundKey. FIPS 197 vectors.
- **Diffie-Hellman** — Step-by-step key exchange with shared secret derivation.
- **Paillier** — Additive homomorphic encryption: keygen, encrypt, homomorphic addition, decrypt.
- **ElGamal** — Exponential ElGamal with homomorphic multiply and bounded discrete log.
- **Shamir Secret Sharing** — Polynomial split, Lagrange interpolation, threshold reconstruction demo.

### Cryptography
- **Elliptic Curve Calculator** — Point addition, scalar multiply, Montgomery ladder, baby-step giant-step ECDLP, preset curves (secp256k1, P-192, P-256).
- **RSA Key Generator** — 16–2048 bit key generation via Web Worker, manual key computation, encrypt/decrypt. NIST notes 2048 as a transitional minimum; production should use ≥3072 per SP 800-57.
- **Cipher Tools** — Caesar (encrypt/decrypt/brute force), Vigenere, ROT13, Atbash, frequency analysis.

### Number Theory
- **Modular Arithmetic** — Mod inverse, mod exponentiation, GCD/extended GCD, Euler's totient, sqrt mod p (Tonelli-Shanks), Legendre symbol, Miller-Rabin primality.
- **Integer Factorization** — Pollard's rho + trial division, totient, divisor count, next prime, prime listing up to 100K.

### Advanced
- **Lattice (LWE)** — Post-quantum encryption with error analysis and brute-force scaling table.
- **Schnorr ZKP** — Interactive zero-knowledge proof with cheating prover mode (soundness demo).
- **LLL Lattice Reduction** — 2D Gram-Schmidt orthogonalization visualization with Lovász condition.
- **Meet-in-the-Middle** — S-DES double encryption key recovery in O(2^n) vs O(2^2n) brute force.
- **Birthday Collision** — Truncated SHA-256 collision finder demonstrating the birthday bound (~√N).
- **Constant-Time Comparison** — Early-exit vs XOR-based string comparison with timing measurements. Demonstrates *why* constant-time matters; the implementations themselves use BigInt (not constant-time — see caveat above).

### Utilities
- **Base & Encoding** — SHA-1/SHA-256 hashing (LF/CRLF aware), text↔hex/binary/decimal/base64, base conversion.
- **Substitution Analysis** — Interactive cipher breaker with frequency/digraph/trigraph analysis.
- **EC Curve Plot** — Scatter plot of all F_p points for small primes with interactive selection.

## Test Vectors & Coverage

95 tests across 6 test suites. Key vector sources:

| Module | Source |
|--------|--------|
| AES-128 ECB | FIPS 197 Appendix B (encrypt + independent decrypt) |
| AES-GCM | NIST SP 800-38D Test Cases 2 & 3 |
| SHA-256 | FIPS 180-4 (`"abc"`, empty string) |
| HMAC-SHA256 | RFC 4231 Test Cases 1 & 2 |
| Miller-Rabin | Known primes + Carmichael numbers (561, 1105, 1729, 15841, 41041) |
| MixColumns | FIPS 197 intermediate state roundtrip |
| LWE | Encrypt/decrypt roundtrip, keygen consistency |
| Shamir SSS | Known polynomial reconstruction, t-1 insufficiency |
| Pollard's rho | 15-digit and 14-digit semiprime factorization |
| Bleichenbacher | End-to-end interval narrowing on 24-bit modulus |

Branch coverage is not yet configured (`vitest --coverage` with v8 provider is on the backlog).

## Tech Stack

- **React 19** + **Vite 8** — Code-split with React.lazy (main bundle 220KB, 67KB gzipped)
- **TypeScript 5.9** — Strict mode, noUnusedLocals, verbatimModuleSyntax
- **Tailwind CSS v4** + **shadcn/ui** — Dark/light theme, responsive 320px–1280px+
- **Vitest** — 95 tests with NIST/RFC vector attribution
- **BigInt** — Arbitrary precision, no external math libraries
- **Web Crypto API** — CSPRNG via `crypto.getRandomValues()`, `crypto.subtle` for ECDSA/AES/HMAC comparison
- **hash-wasm** — Argon2id WASM in dedicated Web Worker
- **ESLint** — `Math.random` banned project-wide via `no-restricted-properties`

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
    usePhaseStatus.ts     # Shared workflow phase status (pending/active/complete)
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

**Real attacks, not simulations.** Every attack page computes the actual exploit — the recovered plaintext is the output of the algorithm, not a pre-known value revealed with animation. This is enforced as a project rule: any demo that simulates rather than computes must be labeled explicitly. The distinction matters educationally because students need to see that these attacks are *computationally feasible*, not just theoretically possible.

**BigInt arithmetic with documented limitations.** GHASH length encoding uses 32-bit JS bitwise ops (correct for inputs < 268MB, documented in source). `generateRandomPrime` draws fresh CSPRNG candidates per iteration (FIPS 186-5 §B.3.3 compliant). Miller-Rabin uses 12 fixed witnesses + CSPRNG extras above the deterministic threshold of 3.3×10²⁴. BigInt operations are not constant-time — timing leaks are proportional to operand size (explicitly called out on the Constant-Time Comparison page). These are deliberate scope boundaries for an educational tool, not oversights — and each one has a source comment explaining the tradeoff.

**RSA keygen in a Web Worker.** Generating 2048-bit keys requires iterative primality testing that blocks the main thread for 1–5 seconds. Moved to `crypto.worker.ts` with a stale-response guard (`genIdRef`) so rapid re-generation doesn't apply an outdated result.

## Security Headers

Deployed on Netlify (`public/_headers`) and Vercel (`vercel.json`) with matching headers:

| Header | Value | Notes |
|--------|-------|-------|
| Content-Security-Policy | `script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self'; frame-ancestors 'none'` | `unsafe-inline` for Tailwind v4 + React `style={}`; `wasm-unsafe-eval` for hash-wasm's `WebAssembly.compile()` (Argon2id) |
| Strict-Transport-Security | `max-age=31536000` | 1-year HSTS, apex only (no preload — see SECURITY.md) |
| Referrer-Policy | `no-referrer` | |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | |
| Cross-Origin-Opener-Policy | `same-origin` | |
| Cross-Origin-Embedder-Policy | `require-corp` | |
| Cross-Origin-Resource-Policy | `same-origin` | |
| X-Frame-Options | `DENY` | |
| X-Content-Type-Options | `nosniff` | |
| Cache-Control | `no-cache` (HTML), `immutable` (hashed assets) | |

## Further Reading

- [Cryptopals Challenges](https://cryptopals.com/) — the canonical "learn crypto by breaking it" problem set
- [Dan Boneh's Cryptography Course](https://crypto.stanford.edu/~dabo/courses/OnlineCrypto/) — Stanford's free crypto course
- [RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446) — TLS 1.3 specification
- [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800-38d/final) — AES-GCM specification
- [FIPS 197](https://csrc.nist.gov/pubs/fips/197/final) — AES specification
- [Twenty Years of Attacks on the RSA Cryptosystem](https://crypto.stanford.edu/~dabo/pubs/papers/RSA-survey.pdf) — Boneh's RSA attack survey

## License

MIT
