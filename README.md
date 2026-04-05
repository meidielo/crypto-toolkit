# CryptoToolkit

A unified, client-side educational cryptography calculator built with React, TypeScript, and Tailwind CSS. All computation runs in-browser using BigInt arithmetic -- no server required, no timeouts.

Inspired by [christelbach.com](http://www.christelbach.com/ECCalculator.aspx) but with a modern UI and expanded toolset.

## Modules

### Cryptography
- **Elliptic Curve Calculator** -- Point addition (P+Q) and scalar multiplication (kP) on curves y² = x³ + Ax + B over F_p. Step-by-step calculation display, points table with order/generator detection, preset curves (secp256k1, P-192, P-256).
- **RSA Key Generator** -- Random key pair generation (16-2048 bit), manual key computation from primes p and q, encrypt/decrypt with modular exponentiation.
- **Cipher Tools** -- Caesar cipher (encrypt/decrypt/brute force all 26 shifts), Vigenere cipher, ROT13, Atbash, and letter frequency analysis.

### Number Theory
- **Modular Arithmetic** -- Modular inverse (extended Euclidean), modular exponentiation, GCD/extended GCD with Bezout coefficients, Euler's totient, square root mod p (Tonelli-Shanks), Legendre symbol, Miller-Rabin primality test.
- **Integer Factorization** -- Trial division factorization, Euler's totient, divisor count, next prime finder, prime number listing up to 100,000.

### Utilities
- **Base & Text Converter** -- SHA-1/SHA-256 hashing with LF/CRLF toggle and decimal BigInt output, text to hex/binary/decimal/base64 encoding, number base conversion (bases 2-16).

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
    ec-math.ts        # Elliptic curve math engine (point add, scalar multiply, Tonelli-Shanks)
    crypto-math.ts    # General crypto utilities (RSA, primality, factorization, ciphers, encoding)
    utils.ts          # UI utility (cn)
  components/
    Sidebar.tsx       # Navigation sidebar with categorized tool links
    ThemeToggle.tsx    # Dark/light theme toggle
    pages/            # One component per tool module
    ui/               # shadcn/ui base components
  App.tsx             # Main app shell with sidebar + content routing
  main.tsx            # Entry point
```

All math operations use JavaScript's native `BigInt` for arbitrary-precision integer arithmetic. No external math libraries are required. The elliptic curve engine implements:

- Extended Euclidean Algorithm for modular inverse
- Double-and-add for scalar multiplication
- Tonelli-Shanks for modular square roots
- Miller-Rabin for primality testing
- Web Crypto API for SHA-1/SHA-256 hashing

## Educational Use

This tool is designed for learning cryptography. It is **not** intended for production cryptographic operations. Key features for students:

- Step-by-step calculation breakdowns
- Preset curves for quick experimentation
- Quick-pick points from the curve's point table
- Line ending awareness for hashing (a common pitfall)
- Visual prime factorization with related number-theoretic properties

## License

MIT
