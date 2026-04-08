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
