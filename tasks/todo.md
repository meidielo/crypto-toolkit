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

## Phase 2: ECDSA Workflow Sandbox (NEXT)
- [ ] ECDSA step-by-step guided dashboard
- [ ] Hashing module with line-ending awareness tied to ECDSA flow
- [ ] Signature generation walkthrough (k, r, s computation)
- [ ] Signature verification walkthrough (w, u1, u2, v)
- [ ] Pedagogical field labeling (prime field p vs curve order q)

## Phase 3: Additional Workflows (FUTURE)
- [ ] Diffie-Hellman key exchange walkthrough
- [ ] RSA signing/verification workflow
- [ ] ElGamal encryption workflow
- [ ] Menezes-Vanstone EC ElGamal (from christelbach)
- [ ] Shamir Secret Sharing

## Phase 4: Polish (FUTURE)
- [ ] Interactive curve visualization (F_p grid plot)
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts
- [ ] Export/share calculations

## Review - Phase 1
- All 6 modules render and compute correctly
- Zero console errors
- Production build: 318KB JS (96KB gzipped), 55KB CSS (10KB gzipped)
- Verified: EC point addition, scalar multiply, RSA keygen, mod inverse, factorization, Caesar cipher, SHA-1 hashing
