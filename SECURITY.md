# Security Policy

## Scope

CryptoToolkit is an **educational tool**. The cryptographic implementations are designed for learning and are explicitly **not suitable for production use**.

Known non-production characteristics:
- BigInt arithmetic is not constant-time (timing leaks proportional to operand size)
- Key material is not zeroized after use
- No formal verification or side-channel analysis has been performed
- `generateRandomPrime` uses `nextPrime(random)` which biases toward primes following large gaps (documented with FIPS 186-5 §B.3.3 reference)
- GHASH length encoding uses 32-bit JS bitwise operations (correct for inputs < 268MB)

## Reporting a Vulnerability

If you find a correctness bug in a cryptographic implementation (wrong output for a known test vector, an attack demo that doesn't actually compute what it claims, or a security header misconfiguration):

1. **Open a GitHub issue** — this is an educational project, not production infrastructure, so responsible disclosure timelines don't apply
2. Include: what you expected, what you got, and which test vector or spec section applies
3. If you have a fix, PRs are welcome

## Audit History

This codebase has been through 5 internal audit sweeps covering:
- FIPS 197 / SP 800-38D test vector verification (AES, GCM)
- FIPS 180-4 test vector verification (SHA-256)
- RFC 4231 test vector verification (HMAC-SHA256)
- Miller-Rabin correctness against Carmichael numbers
- CSP header verification against deployed headers
- CSPRNG usage audit (`Math.random` banned via ESLint)
- Dependency placement audit (build tools in devDependencies)
- BigInt falsy-zero audit (`0n` is falsy in JS)

Findings and resolutions are tracked in `tasks/todo.md`.
