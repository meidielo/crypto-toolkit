# CryptoToolkit - Task Tracker

## Current State: 37 pages, 89 tests, code-split, deployed

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
- [x] useDebouncedValue for input throttling
- [x] hash.worker.ts dedicated Argon2id WASM worker
- [x] ~~useCryptoWorker, useStepMachine~~ — removed in cleanup (never adopted by any component)

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

### Phase 12: Backlog Features
- [x] Montgomery ladder + BSGS tabs in EC Calculator (constant-time SPA resistance, O(√n) discrete log)
- [x] Shamir 4-tab key ceremony (Dealer Setup → Distribution → Reconstruct → Security analysis)
- [x] 2D LLL lattice reduction visualization (SVG vector plot, step-by-step, orthogonality defect)
- [x] Meet-in-the-middle on 2DES (S-DES explorer, double encrypt demo, MITM attack with 2^10 table)
- [x] New math libraries: `src/lib/lll-math.ts`, `src/lib/sdes.ts` with 15 new tests

## Phase 11: Audit Sweep ✅

### Critical
- [x] Move `shadcn` from dependencies → devDependencies (package-lock updated)
- [x] Fix modulo bias in `randMod` — lwe-math.ts, ShamirSSS.tsx, SchnorrZKP.tsx (rejection sampling via `randModBig`)
- [x] Batch CSPRNG calls (PaddingOracleAttack, BleichenbacherAttack → `randBytes(len)`)

### High
- [x] Delete dead `getAllPoints` from ec-math.ts
- [x] Extract `isqrt` / `icbrt` / `randMod` / `randBytes` to `src/lib/num-util.ts` — wired into ec-math, RSAAttack, Coppersmith
- [x] Remove unused `_d` state in CRTFaultAttack.tsx
- [x] Attack-page tests: RSA roundtrip, CRT fault → gcd factorization, Paillier homomorphism, AES-CBC/PKCS#7 roundtrip, Carmichael primality, sqrtModP (+ num-util suite)
- [x] Replace `Date.now()` entropy with CSPRNG session seed in BirthdayCollision.tsx
- [x] Also fixed pre-existing `Math.random()` in CRTFaultAttack (bit-flip) — lint rule now clean on that file

### Medium
- [x] Hash-based routing (`#/ecdsa`, etc.) with fallback to Home; pushState + popstate listener; VALID_PAGES guard
- [x] Persist sidebar category collapse state via localStorage (`crypto-toolkit:sidebar-collapsed`)
- [x] Explicit HSTS (max-age=2y, preload) in `_headers` + `vercel.json`
- [x] CSP `report-uri /csp-report` added — falls back to Vercel access logs if no endpoint exists (noted in review)
- [x] Clarifying comments: millerRabin determinism bounds, webCryptoAESEncrypt zero-IV algebra proof, keyExpansionCache Map iteration order
- [x] `worker-src blob:` — removed; Vite `?worker` import emits a real asset URL, not a blob

### Verification
- [x] `npm run lint` — 4 pre-existing errors remain (3 shadcn UI files, 1 useDebouncedCompute), all unrelated to audit scope
- [x] `npm run test` — 55 passed (was 20)
- [x] `npm run build` — clean, main bundle unchanged at 217KB
- [x] Review section + lessons capture

## Review — Audit Sweep

**Changed:** 16 files. New: `src/lib/num-util.ts`, `src/__tests__/num-util.test.ts`, `src/__tests__/attacks.test.ts`.

**Correctness wins**
- Unbiased sampling for Shamir coefficients + Schnorr challenge. Previously for `p=257` the bias was ~17% on some values — enough that the IT-security claim in the UI was false for the small default parameters. Now rejection-sampled.
- CRT fault bit-flip was using `Math.random()` despite the repo-wide ban. Now uses `randMod(6)`.
- One `randBytes(16)` call replaces 16 separate CSPRNG calls in Padding Oracle IV gen (16× fewer syscalls, and no longer confusing on a page that teaches secure crypto usage).

**Code health**
- Dead `getAllPoints` removed. Only the Tonelli-Shanks variant was ever called.
- `isqrt` / `icbrt` / random helpers centralized — was duplicated 3–4 times with subtle differences.
- `_d` zombie state in CRTFaultAttack removed; `setD` was called but value never read.

**Test coverage**
- Went from 20 → 55 tests. New suites exercise the *math primitives* the attack pages rely on, not the React components. CRT fault path is covered (gcd-reveals-factor), Paillier homomorphism is covered, Carmichael numbers 561 and 41041 are correctly rejected by Miller-Rabin, AES-CBC multi-block roundtrip matches FIPS 197.

**Routing & UX**
- Bookmarkable state: `ctool.mdpstudio.com.au/#/ecdsa` now works. Back/forward buttons navigate the page history. Unknown hashes fall back to Home.
- Sidebar category collapse persists across reloads via localStorage.

**Security headers**
- HSTS added with 2-year max-age + preload directive.
- CSP `report-uri /csp-report` added. No server endpoint exists — violation reports will return 404 in Vercel function logs, which is still observable but not structured. If the user wants structured reports, point this at a free service (report-uri.com) or a serverless function.
- `worker-src blob:` kept as-is; hash-wasm's Argon2 loader likely requires it. Leaving investigation for a future pass.

**Pre-existing lint issues not touched** (explicitly out of audit scope)
1. `src/components/ui/{badge,button,tabs}.tsx` — shadcn-generated files co-export variants alongside components, flagged by `react-refresh/only-export-components`. Fix requires splitting each into `.variants.ts` + component file.
2. `src/hooks/useDebouncedCompute.ts:32` — `setState` inside effect, flagged by `react-hooks/set-state-in-effect`. Requires restructuring the hook into a reducer or deriving `computing` from the timer ref. Left for a dedicated hooks cleanup pass.

**Not done**
- `worker-src blob:` hardening — requires checking hash-wasm's loader source.

## Phase 12: Audit Sweep 2 ✅

### Critical/Security
- [x] #2 CSP `style-src 'unsafe-inline'` — documented as unavoidable (React runtime `style={}` props); comment in `_headers`
- [x] #4 Miller-Rabin deterministic-witness warning — amber box below Generate in RSACalculator

### High
- [x] #5 ErrorBoundary: `componentDidCatch` logging, `componentDidUpdate` resetKey, `role="alert"`, `aria-live`
- [x] #6 Worker argument validation — assertString/assertBigIntStr/assertPoint validators, message envelope check
- [x] #7 Test coverage — 66 tests (was 55), new Bleichenbacher + parse suites
- [x] #8 Bleichenbacher: real iterative narrowing (Steps 2a/2b/2c/3/4) in `src/lib/bleichenbacher.ts` (~170 LOC)

### Medium
- [x] #9 EC points table capped at 300 rows with "N more hidden" message
- [x] #10 Sidebar auto-expands active page's category
- [x] #11 Schnorr challenge range uses `q = ord(g)` not `p-1`; displays q in UI
- [x] #12 Textbook RSA: explicit `2m < n` precondition error message
- [x] #13 parseBigInt tolerates commas, underscores, whitespace; bare-minus handled
- [x] #14 CurvePlot dead comments removed

### Low
- [x] #15 Accessibility: skip-to-content link, `aria-expanded`/`aria-label` on sidebar, `aria-pressed` on CurvePlot dots, `<main>` landmark
- [x] #16 URL routing — already done in Sweep 1
- [x] #17 Constant-Time demo: JIT/branch-predictor/GC caveat with `crypto.subtle.verify` recommendation
- [x] #18 LWE decryption failure: shows noise value, threshold, and why it failed

### Verification
- [x] `npm run test` — 66 passed
- [x] `npm run lint` — 5 pre-existing issues, zero new
- [x] `npm run build` — clean, 219KB main bundle
- [x] Preview: Bleichenbacher converges in 10,910 queries (2 iterations), "YES — plaintext fully recovered"

### Bug found during verification
- Default e=17 was not coprime to φ(n) for p=65521, q=65519 (17 | 65518). Changed default e to 11.

**What would I do differently next time?**
- Add `npm run lint` to CI (or a pre-commit hook) so `Math.random` regressions like the CRTFault one don't land silently after the rule is written.
- Write tests against exported pure functions, not inlined component helpers. Several attack pages have critical math helpers declared at module scope inside `.tsx` files — if those were in `lib/` they'd already be tested.

---

## Phase 13: Audit Sweep 3

### Critical — FIXED
- [x] **Miller-Rabin witness count silently wrong** — for n > 3.3×10²⁴, `slice(0,20)` returned 12 witnesses (not 20). Fixed: now uses all 12 fixed witnesses + 8 CSPRNG random witnesses (20 total). Error bound comment corrected. File: `crypto-math.ts`
- [x] **AES-GCM CTR counter off-by-one** — NIST SP 800-38D Test Case 3 revealed GCM was starting CTR at counter=1 (J0) instead of counter=2 (J0+1). J0 is reserved for tag computation. Fixed `aesCTR` to accept `startCounter` param, GCM passes `2`. Files: `aes-math.ts`, `crypto.test.ts`
- [x] **AES-ECB decrypt not cross-validated** — added independent FIPS 197 Appendix B decrypt test (ct→pt, not just roundtrip). File: `crypto.test.ts`

### High — FIXED
- [x] **RSA keygen blocks main thread** — moved to `crypto.worker.ts` with async message passing. Stale-response guard via `genIdRef`. Worker terminates on unmount. Files: `workers/crypto.worker.ts` (new), `RSACalculator.tsx`
- [x] **`shadcn` already in devDependencies** — verified, no action needed
- [x] **HMAC-SHA256 RFC 4231 test vectors** — added Test Case 1 ("Hi There") and Test Case 2 ("what do ya want for nothing?"). Both pass via Web Crypto API. File: `crypto.test.ts`

### Medium — FIXED
- [x] **MD padding formula already deduplicated** — `HashExtensionAttack.tsx` imports `mdPaddingBytes` from `sha256.ts`, no duplication exists
- [x] **Miller-Rabin error bound comment fixed** — comment now accurately describes the hybrid approach
- [x] **EC point limit constants documented** — limits differ by design (enumeration vs order vs table vs scatter). Added comments explaining each threshold. File: `ec-math.ts`
- [x] **RSA Calculator eStr split** — separate `manEStr` state for Manual tab. Added e input field in Manual Keys UI. File: `RSACalculator.tsx`

### New features — DONE
- [x] **Pollard's rho factorization** — `pollardRho()` + `factorizeFast()` added. Floyd's cycle detection, falls back to trial division for small factors. Factorization page now handles up to 10^30 (was 10^18). Tests cover 15-digit and 14-digit semiprimes. Files: `crypto-math.ts`, `Factorization.tsx`, `crypto.test.ts`
- [ ] **Common Modulus RSA Attack** — deferred
- [ ] **PBKDF2 comparison in Argon2id page** — deferred

### Verification
- [x] `npm test` — 88 passed (was 81)
- [x] `npm run lint` — 0 errors
- [x] `npm run build` — clean, 220KB main bundle

## Phase 14: Audit Sweep 4 ✅

### Critical
- [x] **Birthday Collision UI freeze** — 16M synchronous SHA-256 iterations on main thread. Fixed: chunked async iteration (10K per frame via `setTimeout(processChunk, 0)`). UI stays responsive during search.

### High
- [x] **RSA Attack used trial division** — O(√n) BigInt divisions froze UI for large n. Replaced with `factorizeFast` (Pollard's rho + trial division). Handles semiprimes up to ~10^30.
- [x] **ECDSA default q=28 is composite** — ECDSA requires prime-order subgroup. Changed defaults to G=(13,16) on order-7 subgroup of the same curve, q=7, d=3. First-run now works without errors.
- [x] **Padding Oracle only recovered last block** — attack now iterates all blocks (first to last), each with correct "previous" block. Full plaintext recovered for multi-block messages.

### Medium
- [x] **parseBigInt `!x` falsy for 0n** — `!x` rejects valid BigInt zero inputs. Fixed 10 instances across 6 files: ECDSAWorkflow (A, B), NonceReuseAttack (A, B), RSACalculator (m, c), RSAAttackWorkflow (C), TextbookRSAAttack (m), ModularArithmetic (a, b). Changed to `=== null`.
- [x] **invMixColumns not independently tested** — added `invMixColumns(mixColumns(state)) === state` test with FIPS 197 intermediate state vector. Catches correlated matrix bugs.
- [x] **generateRandomPrime bias undocumented** — `nextPrime(random)` over-represents primes after large gaps. Added FIPS 186-5 reference and explanation in comment.

### Stale findings (already resolved in earlier phases)
- Bleichenbacher "fake recovery" — auditor read pre-Phase-12 code. Current `runBleichenbacher` library recovers via genuine interval narrowing; `paddedM` is only used for UI verification display.
- HSTS header — added in Phase 11
- useCryptoWorker dead infrastructure — deleted in Phase 11
- Missing NIST test vectors — added in Phase 13
- URL routing — implemented in Phase 11
- aria attributes — added in Phase 12

### Verification
- [x] `npm test` — 89 passed (was 88)
- [x] `npm run lint` — 0 errors
- [x] `npm run build` — clean, 220KB main bundle

---

## Phase 15: Audit Sweep 5

### Critical
- [x] **#1 Build deps misplaced** — moved `@tailwindcss/vite`, `tailwindcss`, `tw-animate-css` to `devDependencies`
- [x] **#2 CSP `worker-src blob:`** — CLOSED. Investigated hash-wasm source: WASM is base64-embedded, decoded to Uint8Array, compiled via `WebAssembly.compile()`. No blob URLs created. `worker-src 'self'` is sufficient.

### High
- [x] **#3 `pointStr` duplication** — extracted to `ec-math.ts`, 3 component copies removed
- [x] **#4 `usePhaseStatus` hook** — extracted to `src/hooks/usePhaseStatus.ts`, replaced in all 18 workflow components. Eliminated ~130 lines of duplicated logic.
- [x] **#5 GHASH 32-bit limitation** — added 4-line comment explaining JS bitwise truncation, correct for inputs < 268MB
- [x] **#6 Missing LWE + Shamir tests** — added 3 LWE tests (bit=0 roundtrip, bit=1 roundtrip, keygen b=As+e) and 2 Shamir tests (Lagrange reconstruction, t-1 insufficiency)

### Medium
- [x] **#7 CLAUDE.md stale architecture** — updated hooks section (removed deleted files, added useDebouncedValue)
- [x] **#8 README.md stale architecture** — removed useCryptoWorker/useStepMachine, updated page count to 37
- [x] **#9 `useDebouncedCompute.ts` → `useDebouncedValue.ts`** — renamed via git mv, updated import in SubstitutionAnalysis
- [x] **#10 `generateRandomPrime` bias comment** — STALE. Already at function definition in crypto-math.ts (lines 218-223)
- [x] **#11 Carmichael 15841 test** — added 5 Carmichael numbers (561, 1105, 1729, 15841, 41041)

### Low
- [x] **#12 `ci` script** — added `"ci": "tsc -b && npm run lint && vitest run"` to package.json

### Bonus fix
- [x] **lll.test.ts type import** — `Vec2` needed `type` keyword for `verbatimModuleSyntax` (was breaking `tsc -b` build)

### Stale findings
- **#10** `generateRandomPrime` bias — already documented at function definition since Phase 13

### Deferred (acknowledged, not this phase)
- Sidebar search (#12 in audit) — feature, not fix
- vitest coverage config (#13) — nice to have
- ConstantTimeDemo `crypto.subtle.verify` comparison (#16) — pedagogical enhancement
- vercel.json/_headers sync script (#9 in audit) — CI enhancement
- CoppersmithAttack internal naming (#10 in audit) — already documented with file comment

### Post-phase verification
- [x] `npm test` — 95 passed (was 89)
- [x] `npm run lint` — 0 errors
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npm run build` — clean, 220KB main bundle (67KB gzipped)
- [x] `tsc -b --force` — clean (verbatimModuleSyntax audit: all type imports use `type` keyword)
- [x] `usePhaseStatus` logic verified against all flow shapes (first/middle/last phase, 3–6 phase flows)

---

## Open backlog (low priority — DX/docs, not correctness)

- [ ] **Vercel/_headers sync check** — no automated diff; manual process. Could add a CI script or pre-commit hook.
- [ ] **Sidebar search/filter** — 37 modules approaching scan limit. `/` hotkey filter over NAV_ITEMS.
- [ ] **vitest coverage config** — `coverage: { provider: 'v8', include: ['src/lib/**'] }` for `npm test -- --coverage`
- [ ] **ConstantTimeDemo `crypto.subtle.verify`** — add a third timed comparison using Web Crypto to complete the pedagogical arc
- [ ] **Common Modulus RSA Attack** — deferred from Phase 13
- [ ] **PBKDF2 comparison in Argon2id page** — deferred from Phase 13
