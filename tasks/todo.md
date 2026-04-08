# CryptoToolkit - Task Tracker

## Current State: 35 pages, 20 tests, code-split, deployed

## Completed Phases

### Phase 1: Core Platform
- [x] Vite + React + TS + Tailwind v4 + shadcn/ui
- [x] EC math engine, crypto math utilities
- [x] 6 calculator pages (EC, RSA, Modular, Base, Factorization, Cipher)

### Phase 2: Guided Workflows
- [x] ECDSA, Paillier, ElGamal, RSA Attack, Substitution Analysis, DH
- [x] StepCard shared component

### Phase 3: Responsive UI
- [x] Mobile overlay sidebar, responsive grids, themed scrollbar

### Phase 4: Cryptographic Gaps
- [x] AES-128 round visualization (animated ShiftRows)
- [x] ECDSA nonce reuse attack + RFC 6979
- [x] Post-quantum LWE module
- [x] Security banner, curve contradiction validation

### Phase 5: Protocol Composition
- [x] AES-GCM (CTR + GHASH)
- [x] Argon2id via WASM Web Worker
- [x] TLS 1.3 handshake (real ECDSA via crypto.subtle)
- [x] Schnorr ZKP with cheating prover
- [x] HMAC-SHA256 walkthrough

### Phase 6: Performance Architecture
- [x] useCryptoWorker with stale response guard
- [x] useDebouncedValue for input throttling
- [x] useStepMachine deterministic FSM
- [x] hash.worker.ts dedicated Argon2id WASM worker

### Phase 7-8: Audit Fixes
- [x] AES-ECB decrypt (real inverse cipher for Padding Oracle)
- [x] Custom SHA-256 with exposed internal state (real hash extension)
- [x] CSP hardened (removed unsafe-inline for scripts)
- [x] COOP/COEP headers
- [x] ECDSA r,s range check, q prime validation, G order check
- [x] Paillier g validation, Schnorr subgroup validation
- [x] parseBigInt 2000-char guard (centralized in lib/parse.ts)
- [x] tonelliShanks + RSA keygen loop guards
- [x] keyExpansion LRU cache
- [x] Vitest test suite (20 tests)

### Phase 9: Attack Demos
- [x] GCM Nonce Reuse, DH Subgroup, Wiener's Attack, ECB Penguin
- [x] Bleichenbacher PKCS#1 v1.5, Hastad Broadcast (e=3)
- [x] CRT-RSA Fault Injection (Boneh-DeMillo-Lipton)
- [x] Birthday Collision finder, Constant-Time Comparison demo
- [x] Shamir Secret Sharing

### Phase 10: UI/UX Overhaul
- [x] Home screen with gradient hero, category cards, emoji icons
- [x] Collapsible sidebar categories (all collapsed by default)
- [x] Right-side sidebar with slide-in animation
- [x] Header: [CT Title] left, [theme + hamburger] right
- [x] Security banner collapsed to one-liner with "More" expand
- [x] Purple accent theme restored
- [x] React.lazy code splitting (main bundle 520KB → 217KB)
- [x] ErrorBoundary wraps all pages

## Future
- [ ] Bleichenbacher full iterative interval narrowing
- [ ] Montgomery ladder + BSGS exposed in UI tabs
- [ ] URL hash routing for bookmarkable state
- [ ] Shamir multi-tab key ceremony
- [ ] 2D lattice reduction (LLL) visualization
- [ ] Meet-in-the-middle on 2DES
