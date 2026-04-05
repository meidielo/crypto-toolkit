// Web Crypto API wrappers for constant-time verification
// These use the browser's native crypto.subtle which runs in constant-time C/C++

// ============= AES-128 =============

export async function webCryptoAESEncrypt(
  plaintext: Uint8Array,
  key: Uint8Array
): Promise<{ ciphertext: Uint8Array; mode: string }> {
  // ECB mode isn't directly available in Web Crypto, use AES-CBC with zero IV
  // to simulate single-block encryption (first block = ECB behavior)
  const keyBuf = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  const ptBuf = plaintext.buffer.slice(plaintext.byteOffset, plaintext.byteOffset + plaintext.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, 'AES-CBC', false, ['encrypt']);
  const iv = new ArrayBuffer(16); // zero IV
  const result = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, ptBuf);
  // First 16 bytes = AES-ECB of the plaintext block
  return { ciphertext: new Uint8Array(result).slice(0, 16), mode: 'AES-CBC (zero IV, first block = ECB)' };
}

// ============= RSA =============

export async function webCryptoRSAEncryptDecrypt(
  message: bigint,
  bitLength: number
): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  encrypted: Uint8Array;
  decrypted: Uint8Array;
  engine: string;
} | null> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: bitLength, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    );

    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Convert message bigint to bytes
    const msgHex = message.toString(16).padStart(2, '0');
    const msgBytes = new Uint8Array(Math.ceil(msgHex.length / 2));
    for (let i = 0; i < msgBytes.length; i++) {
      msgBytes[i] = parseInt(msgHex.substring(i * 2, i * 2 + 2), 16);
    }

    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, keyPair.publicKey, msgBytes);
    const decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, keyPair.privateKey, encrypted);

    return {
      publicKey,
      privateKey,
      encrypted: new Uint8Array(encrypted),
      decrypted: new Uint8Array(decrypted),
      engine: 'Web Crypto RSA-OAEP (constant-time native implementation)',
    };
  } catch {
    return null;
  }
}

// ============= ECDSA =============

export async function webCryptoECDSASignVerify(
  message: string
): Promise<{
  publicKeyJwk: JsonWebKey;
  signature: Uint8Array;
  verified: boolean;
  curve: string;
  engine: string;
} | null> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const msgBytes = new TextEncoder().encode(message);

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keyPair.privateKey,
      msgBytes
    );

    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keyPair.publicKey,
      signature,
      msgBytes
    );

    return {
      publicKeyJwk,
      signature: new Uint8Array(signature),
      verified,
      curve: 'P-256 (NIST)',
      engine: 'Web Crypto ECDSA (constant-time native implementation)',
    };
  } catch {
    return null;
  }
}

// Helper: bytes to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
