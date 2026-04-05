# CryptoToolkit - Task Tracker

## Phase 1: Core Platform (COMPLETE)
- [x] Scaffold Vite + React + TS + Tailwind v4 + shadcn/ui
- [x] Implement EC math engine (ec-math.ts) -- point add, scalar multiply, Tonelli-Shanks, point enumeration
- [x] Implement crypto math utilities (crypto-math.ts) -- RSA, primality, factorization, ciphers, encoding
- [x] Build sidebar navigation with categorized tool links
- [x] Build Elliptic Curve Calculator page (point addition, scalar multiply, points table)
- [x] Build RSA Key Generator page (generate, manual keys, encrypt/decrypt)
- [x] Build Modular Arithmetic page (7 calculators)
- [x] Build Base & Text Converter page (hashing, text encoding, number base)
- [x] Build Integer Factorization page (factorize, prime listing)
- [x] Build Cipher Tools page (Caesar, Vigenere, ROT13, Atbash, frequency analysis)
- [x] Dark/light theme toggle
- [x] Production build passes
- [x] All 6 modules functionally tested

## Phase 2: Guided Workflow Modules (COMPLETE)
- [x] StepCard shared component for step-by-step workflows
- [x] Add crypto-math utilities (paillierL, discreteLogBounded, countNgrams)
- [x] ECDSA Signing Workflow (setup, hash, sign, verify with all intermediate values)
- [x] Paillier Cryptosystem Workflow (keygen, encrypt, homomorphic add, decrypt)
- [x] ElGamal Cryptosystem Workflow (setup, encrypt, homomorphic multiply, decrypt)
- [x] RSA Attack Workflow (factor n, compute d, decrypt M, verify)
- [x] Substitution Cipher Analysis (frequency analysis, digraphs, trigraphs, interactive decode)
- [x] Diffie-Hellman Key Exchange (public params, Alice, Bob, shared secret)
- [x] Updated sidebar with WORKFLOWS category
- [x] All workflows tested with assignment values

## Phase 3: Responsive UI & Design Polish (COMPLETE)
- [x] Sidebar: mobile overlay drawer with backdrop, auto-close on nav, Escape key
- [x] App: responsive padding (p-4/p-6), mobile-first sidebar state, min-w-0 on main
- [x] StepCard: wrap-safe header, responsive text sizing, overflow-x-auto on formulas
- [x] All 12 pages: responsive grid breakpoints (grid-cols-1 sm:grid-cols-N)
- [x] All tab lists: flex overflow-x-auto for horizontal scroll
- [x] Substitution/Cipher grid-cols-13: responsive to grid-cols-7 sm:grid-cols-13
- [x] ComputationRow: flex-col on mobile, break-all on values
- [x] Header: truncating title, responsive text size

## Phase 4: Critical Cryptographic Gaps (COMPLETE)
- [x] AES-128 Single Round Visualization (SubBytes, ShiftRows, MixColumns w/ GF(2^8), AddRoundKey)
- [x] Preset curve parameter contradiction validation (identifyCurve, red warnings)
- [x] ECDSA Nonce Reuse Attack workflow (sign twice, extract d, PS3 context)
- [x] Post-Quantum LWE module (keygen, encrypt bit, decrypt, error analysis)
- [x] Security banner (BigInt timing, Math.random not CSPRNG)
- [x] Inline nonce warning on ECDSA page

## Phase 5: Cryptographic Composition (COMPLETE)
- [x] AES-GCM Authenticated Encryption (CTR + GHASH over GF(2^128))
- [x] Argon2id via WASM Web Worker (OWASP presets, timing comparison)
- [x] Schnorr ZKP with cheating prover mode (soundness demo)
- [x] TLS 1.3 Handshake (ECDHE + HKDF + ECDSA + AES-GCM)
- [x] Web Crypto comparison buttons on ECDSA, AES, RSA
- [x] CSPRNG everywhere (crypto.getRandomValues)

## Phase 6: Performance Architecture (COMPLETE)
- [x] useCryptoWorker hook with stale response guard (latestIdRef)
- [x] useDebouncedValue hook for input throttling
- [x] useStepMachine hook (deterministic FSM)
- [x] crypto.worker.ts with BigInt serialization
- [x] hash.worker.ts dedicated Argon2id WASM worker
- [x] Debounced substitution analysis ngrams

## Phase 7: Audit Fixes (COMPLETE)
- [x] ShiftRows ghost cell positioning (destination-based)
- [x] RSA generateRSAKeys max 100 attempt guard
- [x] tonelliShanks 1000 iteration guards on all loops
- [x] Nonce reuse s1=s2 validation
- [x] RSA encrypt m >= n validation
- [x] ECDSA q prime validation
- [x] LWE q label corrected
- [x] ESLint Math.random ban
- [x] Precise timing attack warning (lists specific ops)
- [x] identifyCurve exact parameter matching (not string)
- [x] keyExpansion LRU-16 memoization
- [x] Padding Oracle Attack (AES-CBC Vaudenay)
- [x] Textbook RSA Malleability Attack
- [x] Hash Length Extension Attack (Merkle-Damgard)
- [x] Schnorr cheating prover (soundness)
- [x] RFC 6979 HMAC-DRBG explanation
- [x] Deployment security headers (CSP, X-Frame-Options, caching)

## Future Enhancements
- [ ] Menezes-Vanstone EC ElGamal (from christelbach)
- [ ] Shamir Secret Sharing
- [ ] Interactive curve visualization (F_p grid plot)
- [ ] Export/share calculations

## Review - Phase 1
- All 6 modules render and compute correctly
- Zero console errors
- Production build: 318KB JS (96KB gzipped), 55KB CSS (10KB gzipped)
- Verified: EC point addition, scalar multiply, RSA keygen, mod inverse, factorization, Caesar cipher, SHA-1 hashing

## Review - Phase 2
- All 6 workflow pages render and compute correctly
- Zero console errors
- Production build: 356KB JS (104KB gzipped), 58KB CSS (10KB gzipped)
- Verified: ECDSA Q=dG=(11,3), RSA Attack p=99991 q=100109 M=12345, Paillier lambda=3180 mu=6145, DH shared=2
- RSA Attack factorization uses trial division from 2 upward (fast for educational sizes)
- All values match COSC2536 assignment answers

## Review - Phase 3
- Mobile (375px): sidebar overlay, stacked grids, no clipping, all tabs visible
- Tablet (768px): collapsible sidebar, 2-3 col grids, proper spacing
- Desktop (1280px): unchanged from Phase 2, sidebar auto-open
- Zero console errors
- Production build: 358KB JS (104KB gzipped), 59KB CSS (10KB gzipped)

## Review - Phase 4
- AES: FIPS 197 test vectors, S-Box lookup, ShiftRows, MixColumns GF(2^8) per-column detail
- Nonce Reuse: d=7 recovered from two signatures with same k=3 (curve y²=x³+2x+3 mod 97, q=89)
- LWE: bit 1 encrypted and decrypted correctly, error accumulation visible
- Security banner: visible on first load, dismissible, BigInt timing + CSPRNG warnings
- Curve validation: identifyCurve() detects contradiction when params don't match selected preset
- Zero console errors
- Production build: 389KB JS (112KB gzipped), 63KB CSS (11KB gzipped)
- 15 pages total across 5 categories

## Review - Phase 5-7
- 22 pages across 9 categories, all rendering and computing correctly
- Zero console errors
- Production build: 448KB JS (126KB gzipped), 69KB CSS (12KB gzipped)
- Argon2id: runs in dedicated WASM Web Worker, OWASP default (19MB)
- Web Crypto comparison on ECDSA, AES, RSA
- All 21 audit items addressed
- Deployment headers: CSP, X-Frame-Options, nosniff, no-referrer, Permissions-Policy
- Attack demos: Padding Oracle, Textbook RSA, Hash Extension all functional
- Schnorr cheating prover demonstrates soundness
- RFC 6979 HMAC-DRBG construction documented in Nonce Reuse page
