# CryptoToolkit

A unified, client-side educational cryptography calculator built with React, TypeScript, and Tailwind CSS. All computation runs in-browser using BigInt arithmetic -- no server required, no timeouts.

Inspired by [christelbach.com](http://www.christelbach.com/ECCalculator.aspx) but with a modern UI and expanded toolset.

## Modules

### Cryptography (Calculators)
- **Elliptic Curve Calculator** -- Point addition (P+Q) and scalar multiplication (kP) on curves y² = x³ + Ax + B over F_p. Step-by-step calculation display, points table with order/generator detection, preset curves (secp256k1, P-192, P-256).
- **RSA Key Generator** -- Random key pair generation (16-2048 bit), manual key computation from primes p and q, encrypt/decrypt with modular exponentiation.
- **Cipher Tools** -- Caesar cipher (encrypt/decrypt/brute force all 26 shifts), Vigenere cipher, ROT13, Atbash, and letter frequency analysis.

### Number Theory (Calculators)
- **Modular Arithmetic** -- Modular inverse (extended Euclidean), modular exponentiation, GCD/extended GCD with Bezout coefficients, Euler's totient, square root mod p (Tonelli-Shanks), Legendre symbol, Miller-Rabin primality test.
- **Integer Factorization** -- Trial division factorization, Euler's totient, divisor count, next prime finder, prime number listing up to 100,000.

### Utilities
- **Base & Text Converter** -- SHA-1/SHA-256 hashing with LF/CRLF toggle and decimal BigInt output, text to hex/binary/decimal/base64 encoding, number base conversion (bases 2-16).

### Guided Workflows (Step-by-Step)
- **ECDSA Signing** -- Full ECDSA digital signature workflow: setup curve and keys, hash message (SHA-256), generate signature (r, s) with nonce, verify signature. Shows all intermediate values (lambda, k inverse, u1, u2).
- **Paillier Cryptosystem** -- Additive homomorphic encryption: key generation (n, lambda, mu), encrypt, homomorphic addition (multiply ciphertexts to add plaintexts), decrypt. Prefilled with educational values (p=107, q=61).
- **ElGamal Cryptosystem** -- Exponential ElGamal with homomorphic properties: setup, encrypt, multiply ciphertexts to add messages, decrypt via bounded discrete log.
- **RSA Attack** -- Given (n, e, C), factor n by trial division, recover private key d, decrypt plaintext M, verify. Prefilled with assignment values.
- **Substitution Cipher Analysis** -- Interactive monoalphabetic cipher breaker with frequency analysis bar charts, digraph/trigraph counters, interactive substitution table, and live decoded text preview with English reference frequencies.
- **Diffie-Hellman Key Exchange** -- Step-by-step key exchange: public parameters, Alice computes A, Bob computes B, both derive shared secret. Shows both sides computing independently.

## Tech Stack

- **React 19** + **Vite 8** -- Fast dev/build
- **TypeScript** -- Type safety for math operations
- **Tailwind CSS v4** + **shadcn/ui** -- Modern, polished UI with dark/light theme
- **BigInt** -- Arbitrary precision arithmetic, no external math libraries

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
    ec-math.ts        # Elliptic curve math (point add, scalar multiply, Tonelli-Shanks)
    crypto-math.ts    # RSA, primality, factorization, ciphers, encoding, Paillier, DLog
    utils.ts          # UI utility (cn)
  components/
    Sidebar.tsx       # Navigation sidebar with categorized tool links
    ThemeToggle.tsx    # Dark/light theme toggle
    StepCard.tsx      # Shared step-by-step workflow card component
    pages/            # One component per tool/workflow (12 pages total)
    ui/               # shadcn/ui base components
  App.tsx             # Main app shell with sidebar + content routing
  main.tsx            # Entry point
```

All math operations use JavaScript's native `BigInt` for arbitrary-precision integer arithmetic. No external math libraries are required. The engine implements:

- Extended Euclidean Algorithm for modular inverse
- Double-and-add for EC scalar multiplication
- Tonelli-Shanks for modular square roots
- Miller-Rabin for primality testing
- Web Crypto API for SHA-1/SHA-256 hashing
- Paillier L-function and homomorphic operations
- Bounded discrete logarithm search (for ElGamal)
- N-gram frequency analysis (digraphs, trigraphs)

## Educational Use

This tool is designed for learning cryptography. It is **not** intended for production cryptographic operations. Key features for students:

- Step-by-step calculation breakdowns with intermediate values
- Guided workflows that chain multiple crypto operations together
- Preset values from real coursework assignments for quick verification
- Line ending awareness for hashing (a common pitfall)
- Interactive substitution cipher analysis with English frequency reference
- Homomorphic encryption demos (Paillier additive, ElGamal multiplicative)

## License

MIT
