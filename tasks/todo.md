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

## Phase 4: Future Enhancements
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
