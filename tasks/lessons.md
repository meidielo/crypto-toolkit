# Lessons Learned

## 2026-04-05 - Initial Build

### Don't use require() in ESM/Vite projects
Vite + ESM doesn't support CommonJS require. Always use ES import.

### shadcn init requires Tailwind configured first
Must set up vite.config.ts with tailwindcss plugin and tsconfig paths BEFORE running shadcn init.

### TypeScript noUnusedLocals catches unused imports
Strict TS config flags unused imports as errors. Clean up after every refactor.

### Always follow TEST > UPDATE > COMMIT > NEXT PHASE
User expects verified, documented, committed work before moving forward. No exceptions.

## 2026-04-08 - Audit Rounds

### BigInt 0n is falsy in JavaScript
`!0n === true` — caused Schnorr ZKP verify to silently fail when s=0. Use `=== null` checks, not truthiness.

### parseBigInt must be centralized with length guard
13 files had inline definitions with subtle differences. Centralized to lib/parse.ts with 2000-char limit.

### AES inverse cipher ordering matters
FIPS 197 §5.3 direct inverse: InvShiftRows → InvSubBytes → AddRoundKey → InvMixColumns. Verified with round-trip test.

### Hash extension requires custom SHA-256, not Web Crypto
crypto.subtle.digest doesn't expose internal state. Built custom SHA-256 with getState()/resume constructor.

### React.lazy cuts initial bundle by 60%
35 eager imports → lazy: main bundle 520KB → 217KB. Each page loads on demand.

### Sidebar should open from same side as its trigger button
Hamburger on right = sidebar opens from right. Spatial consistency matters.

### Security banner should be minimal by default
6-line warning takes 40% of viewport. Collapsed to one-liner with "More" expand = better first impression.

### Always update README when adding features
Multiple audits caught stale README (22 pages documented, 35 existed). README is the first thing anyone reads.

## 2026-04-09 - Audit Sweep (Phase 11)

### `arr[0] % q` on a 32-bit source is biased unless `q | 2^32`
Three separate files had `Uint32Array(1) → crypto.getRandomValues → % q` (LWE, Shamir, Schnorr). For small q (e.g. p=257 in Shamir) this skews share distribution and undermines the "information-theoretic security" claim the UI makes. Fix: rejection sampling (`limit = floor(2^32 / q) * q`, resample until buf[0] < limit). For BigInt moduli, same pattern but draw enough bytes and mask the top byte to `bits mod 8`. Now centralized in `src/lib/num-util.ts` (`randMod`, `randModBig`).

### Three copies of `isqrt` and one of `icbrt` in a 35-page project
Drift inevitable. Extracted to `src/lib/num-util.ts` and re-exported through `ec-math.ts`'s existing use of its local `sqrt`. Policy: any math primitive used in ≥ 2 files goes in num-util.

### Map LRU eviction relies on ES2015 insertion-order iteration
`Map.prototype.keys()` yields in insertion order per spec. The key-expansion cache uses `delete + set` on hit (move to tail) and `keys().next().value` for eviction (delete head). This is correct and stable but the "why" wasn't documented — added a paragraph so a future maintainer doesn't "optimize" it away.

### Batched CSPRNG is cheap and obvious — don't loop one byte at a time
`Array.from({length:16}, () => getRandomValues(new Uint8Array(1))[0])` is 16 syscalls instead of 1. Not a correctness bug but embarrassing on a page that teaches correct crypto usage. `randBytes(len)` wrapper in num-util makes the batched form the path of least resistance.

### ESLint bans on `Math.random` catch new offenders but miss pre-existing ones unless you run lint
CRTFaultAttack used `Math.random()` for bit-flip selection. `no-restricted-properties` rule was in place, but the code shipped because nobody ran `npm run lint` on that file after the rule was added. Lesson: add lint to pre-commit, or at minimum CI.

### `setState` inside a `useEffect` with a derived dependency triggers react-hooks/set-state-in-effect
`if (isMobile) setSidebarOpen(false)` in an effect is flagged because it's "state sync from state", which React prefers you do without an effect. Fix: push the side effect into the hook that owns the trigger (`useIsMobile(onEnterMobile)` callback). Component gets a cleaner render path and lint is happy.

### URL hash routing with `pushState` preserves browser back/forward; `replaceState` flattens history
For a bookmarkable SPA where each "page" is a destination, pushState is correct — back button goes to previous page. replaceState is right only for URL normalization (e.g. stripping trailing slashes) where history should not grow.

### `package.json` is declarative; `package-lock.json` is a derived artifact
Moving a dep between sections in package.json doesn't update the lock. Run `npm install --package-lock-only` to resolve without installing, keeping the repo consistent for the next `npm ci`.

## 2026-04-10 - Audit Sweep 2 (Phase 12)

### Always verify `gcd(e, φ(n)) = 1` for RSA defaults
Chose p=65521, q=65519, e=17 for Bleichenbacher demo. Looked fine — but 17 | (q-1) = 65518, so gcd(e, φ(n)) = 17. The component correctly caught it ("e is not coprime to φ(n)") but the *defaults* were broken out of the box. Lesson: after picking any RSA parameter set, compute gcd before shipping.

### Bleichenbacher's attack: the leading 0x00 byte is implicit in BigInt
For k=3 (3-byte modulus), PKCS#1 v1.5 is `00 02 PS 00 M`. As a BigInt, the leading zero disappears: padded = `0x02 PS 00 M`. Initial test had `(0x0002n << 16n) | M` which encodes a 4-byte representation. For k=3, B = 2^(8*(k-2)) = 256, and conforming range is [2B, 3B) = [512, 768). Test value 131138 was way outside. Fix: `(0x02n << 8n) | M`.

### BigInt division truncates toward zero, not negative infinity
`ceilDiv(a, b)` for positive a, b is `(a + b - 1n) / b`. But for negative numerators, `(-7n) / 3n === -2n` (toward zero), not -3 (floor). Bleichenbacher Step 2c needs both `ceilDiv` and `floorDiv` with potentially negative intermediates. Implemented: `floorDiv(a,b) = a < 0n !== b < 0n ? -(abs(a) + abs(b) - 1n) / abs(b) : a / b`.

### `useMemo` for derived view state, not `useEffect` + `setState`
Sidebar auto-expand initially used `useEffect(() => { if (activeCategory) setCollapsed(...) })`. Flagged by `react-hooks/set-state-in-effect`. The fix: `renderedCollapsed = useMemo(() => { ... }, [collapsed, activeCategory])` — derived value, no state mutation, no extra render cycle.

### CSP `style-src 'unsafe-inline'` is unavoidable with React runtime `style={}`
19 occurrences of `style={{...}}` across 7 files (CurvePlot scatter positioning, ShiftRows animation, progress bars). CSP3 `'unsafe-hashes'` only covers inline `style="..."` attributes in HTML, not JS-computed style objects. Nonce-based styles require build tooling changes (e.g., Emotion + nonce injection). Documented honestly rather than claiming a false fix.

## 2026-04-11 - Audit Sweeps 3 & 4 (Phases 13–14)

### AES-GCM CTR counter starts at J0+1, not J0
NIST SP 800-38D reserves J0 (counter=1 for 96-bit IV) for the final tag XOR. Plaintext encryption uses counter=2 onward. Our aesCTR started at 1, producing wrong ciphertext for GCM. NIST Test Case 3 caught it immediately — always test with published vectors before claiming correctness.

### Miller-Rabin: fixed witnesses are deterministic only below a threshold
The 12 fixed witnesses {2..37} are deterministic for n < 3.3×10²⁴. Above that, CSPRNG random witnesses are needed for probabilistic soundness. The original code used `slice(0, rounds)` which returned only 12 witnesses even when `rounds=20` was requested.

### ECDSA requires a prime-order subgroup, not just any group order
Curve y²=x³+x+1 mod 23 has order 28 = 4×7. Using q=28 (composite) for ECDSA is wrong — modular inverse of k fails when gcd(k,q)≠1. Must use a prime-order subgroup: G=(13,16) generates the order-7 subgroup.

### sessionStorage.setItem on every effect run is wasteful and surprising
SecurityBanner wrote `sessionStorage.setItem(key, String(dismissed))` on mount (writing "false"). Harmless but wrong — the intent is to persist *dismissal*, not the initial state. Guard with `if (dismissed)`.

### Audit methodology: read the actual code, not just the task tracker
An external audit flagged 5 items as "still open" by reading tasks/todo.md from an earlier phase. All 5 had been fixed in subsequent phases. Lesson: audit findings must be verified against current source, not historical documentation. The tracker is a planning tool, not a source of truth for current state.

### Pollard's rho needs a primality guard
`pollardRho(p)` on a prime p will loop forever (no non-trivial factor exists). Always check `isPrime(n)` first and return n immediately. The `factorizeFast` wrapper handles this correctly.

### Chunked async iteration keeps UI responsive for long computations
Birthday Collision was doing 16M synchronous SHA-256 iterations, freezing the browser. Chunking 10K iterations per frame via `setTimeout(processChunk, 0)` yields to the event loop. Not as clean as a Web Worker, but sufficient for a demo and avoids the worker setup overhead.

### Route/file naming: keep URLs stable even when terminology evolves
CoppersmithAttack.tsx implements Hastad's Broadcast Attack but the route is `#/coppersmith`. Renaming the route would break bookmarks. Solution: document the naming rationale in a file-level comment, keep the URL.
