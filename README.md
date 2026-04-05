# CryptoToolkit

A unified, client-side educational cryptography platform built with React, TypeScript, and Tailwind CSS. Covers symmetric (AES), asymmetric (ECC/RSA), hashing (SHA), post-quantum (LWE), and implementation vulnerabilities. All computation runs in-browser using BigInt arithmetic with `crypto.getRandomValues()` (CSPRNG) -- no server required, no timeouts.

Inspired by [christelbach.com](http://www.christelbach.com/ECCalculator.aspx) but designed as a complete learning platform for postgraduate cybersecurity curricula.

## Security Notice

This toolkit uses JavaScript BigInt arithmetic which is **not constant-time**. Real cryptographic implementations require constant-time operations to prevent side-channel timing attacks. Web Crypto API comparison buttons are provided on ECDSA, AES, and RSA pages so students can verify results against the browser's native `crypto.subtle` (constant-time C/C++). Never use this code for production cryptography.

## Modules

### Cryptography (Calculators)
- **Elliptic Curve Calculator** -- Point addition (P+Q) and scalar multiplication (kP) on curves y² = x³ + Ax + B over F_p. Step-by-step calculation display, points table with order/generator detection, preset curves (secp256k1, P-192, P-256). **Parameter contradiction validation** -- warns if manually-edited params match a different standard curve than selected.
- **RSA Key Generator** -- Random key pair generation (16-2048 bit), manual key computation from primes p and q, encrypt/decrypt with modular exponentiation. Web Crypto comparison button.
- **Cipher Tools** -- Caesar cipher (encrypt/decrypt/brute force all 26 shifts), Vigenere cipher, ROT13, Atbash, and letter frequency analysis.

### Number Theory (Calculators)
- **Modular Arithmetic** -- Modular inverse (extended Euclidean), modular exponentiation, GCD/extended GCD with Bezout coefficients, Euler's totient, square root mod p (Tonelli-Shanks), Legendre symbol, Miller-Rabin primality test.
- **Integer Factorization** -- Trial division factorization, Euler's totient, divisor count, next prime finder, prime number listing up to 100,000.

### Utilities
- **Base & Text Converter** -- SHA-1/SHA-256 hashing with LF/CRLF toggle and decimal BigInt output, text to hex/binary/decimal/base64 encoding, number base conversion (bases 2-16).

### Guided Workflows (Step-by-Step)
- **ECDSA Signing** -- Full ECDSA digital signature workflow: setup curve and keys, hash message (SHA-256), generate signature (r, s) with nonce, verify signature. Inline warning about nonce uniqueness. Web Crypto comparison button.
- **Paillier Cryptosystem** -- Additive homomorphic encryption: key generation (n, lambda, mu), encrypt, homomorphic addition (multiply ciphertexts to add plaintexts), decrypt. Prefilled with educational values (p=107, q=61).
- **ElGamal Cryptosystem** -- Exponential ElGamal with homomorphic properties: setup, encrypt, multiply ciphertexts to add messages, decrypt via bounded discrete log.
- **RSA Attack** -- Given (n, e, C), factor n by trial division, recover private key d, decrypt plaintext M, verify.
- **Substitution Cipher Analysis** -- Interactive monoalphabetic cipher breaker with frequency analysis bar charts, digraph/trigraph counters, interactive substitution table, and live decoded text preview with English reference frequencies.
- **Diffie-Hellman Key Exchange** -- Step-by-step key exchange: public parameters, Alice computes A, Bob computes B, both derive shared secret.
- **AES-128 Round Visualization** -- Single-round AES breakdown showing SubBytes (S-Box lookup), ShiftRows, MixColumns (GF(2^8) polynomial matrix multiplication with per-column detail), and AddRoundKey. 4x4 state matrix visualization with changed-byte highlighting. FIPS 197 test vectors as defaults. Web Crypto comparison button.
- **ECDSA Nonce Reuse Attack** -- Demonstrates how reusing nonce k across two signatures leaks the private key d. Algebraic extraction of k and d with step-by-step derivation. Explains the PS3 ECDSA compromise (2010) and RFC 6979.

### Post-Quantum Cryptography
- **Lattice (LWE) Encryption** -- Learning With Errors demonstration: key generation (random matrix A, secret s, error e), encrypt a single bit, decrypt with error analysis. Explains why LWE is the basis for NIST ML-KEM (CRYSTALS-Kyber) and why it resists quantum attacks.

## Tech Stack

- **React 19** + **Vite 8** -- Fast dev/build
- **TypeScript** -- Type safety for math operations
- **Tailwind CSS v4** + **shadcn/ui** -- Modern, polished UI with dark/light theme
- **BigInt** -- Arbitrary precision arithmetic, no external math libraries
- **Web Crypto API** -- `crypto.getRandomValues()` for CSPRNG, `crypto.subtle` for constant-time comparison

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Architecture

```
src/
  lib/
    ec-math.ts        # EC math (point add, scalar multiply, Tonelli-Shanks, curve identification)
    crypto-math.ts    # RSA, primality, factorization, ciphers, encoding, Paillier, DLog
    aes-math.ts       # AES S-Box, SubBytes, ShiftRows, MixColumns (GF(2^8)), AddRoundKey, KeyExpansion
    lwe-math.ts       # LWE matrix ops, key generation, encrypt, decrypt
    web-crypto.ts     # Web Crypto API wrappers for constant-time comparison
    utils.ts          # UI utility (cn)
  components/
    Sidebar.tsx       # Navigation sidebar with categorized tool links
    ThemeToggle.tsx    # Dark/light theme toggle
    StepCard.tsx      # Shared step-by-step workflow card component
    StateMatrix.tsx   # 4x4 hex byte grid + vector/matrix display components
    SecurityBanner.tsx # Persistent educational disclaimer (BigInt timing caveat)
    WebCryptoVerify.tsx # Reusable Web Crypto comparison component
    pages/            # One component per tool/workflow (15 pages total)
    ui/               # shadcn/ui base components
  App.tsx             # Main app shell with sidebar + content routing
  main.tsx            # Entry point
```

### Math Engines

All math uses JavaScript's native `BigInt` for arbitrary-precision integer arithmetic:

- Extended Euclidean Algorithm for modular inverse
- Double-and-add for EC scalar multiplication
- Tonelli-Shanks for modular square roots
- Miller-Rabin for primality testing (deterministic for n < 3.3 x 10^24)
- AES S-Box, GF(2^8) multiplication with irreducible polynomial x^8+x^4+x^3+x+1
- Paillier L-function and homomorphic operations
- Bounded discrete logarithm search (for ElGamal)
- LWE matrix-vector multiplication mod q
- N-gram frequency analysis (digraphs, trigraphs)
- Curve identification for parameter contradiction detection

### Security Implementation

- **CSPRNG**: All randomness via `crypto.getRandomValues()` (not `Math.random`)
- **Web Crypto comparison**: `crypto.subtle` used for ECDSA, AES, RSA verification
- **SHA hashing**: Web Crypto API (`crypto.subtle.digest`) for constant-time hashing
- **Security banner**: Visible on first load, explains BigInt timing vulnerability

## Educational Use

This tool is designed for learning cryptography. It covers:

- **Symmetric**: AES-128 with GF(2^8) polynomial matrix multiplication visualization
- **Asymmetric**: ECDSA, RSA, ElGamal, Paillier, Diffie-Hellman with full step-by-step
- **Hashing**: SHA-1/SHA-256 with line-ending awareness
- **Implementation vulnerabilities**: Nonce reuse attack, RSA factorization attack
- **Post-quantum**: LWE encryption with error analysis
- **Classical ciphers**: Caesar, Vigenere, substitution analysis (for historical context)

Key features for students:
- Step-by-step calculation breakdowns with intermediate values
- Web Crypto comparison buttons for constant-time verification
- Preset curve parameter contradiction detection
- Nonce uniqueness warnings on ECDSA signing page
- Preset values from real coursework assignments

## License

MIT
