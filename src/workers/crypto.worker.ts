// Web Worker for CPU-intensive cryptographic operations (RSA keygen).
// Keeps the UI responsive during prime generation.

import { generateRSAKeys } from '@/lib/crypto-math';

export type CryptoWorkerRequest = {
  id: number;
  type: 'rsa-keygen';
  bits: number;
  e: string; // BigInt serialized as string
};

export type CryptoWorkerResponse = {
  id: number;
  result: {
    p: string;
    q: string;
    n: string;
    e: string;
    d: string;
    phi: string;
    dp: string;
    dq: string;
    qinv: string;
  } | null;
  error: string | null;
};

self.onmessage = (ev: MessageEvent<CryptoWorkerRequest>) => {
  const { id, type, bits, e } = ev.data;

  if (type !== 'rsa-keygen') {
    self.postMessage({ id, result: null, error: `Unknown type: ${type}` });
    return;
  }

  if (typeof bits !== 'number' || bits < 16 || bits > 4096) {
    self.postMessage({ id, result: null, error: 'bits must be 16-4096' });
    return;
  }

  try {
    const eBig = BigInt(e);
    const keys = generateRSAKeys(bits, eBig);
    const response: CryptoWorkerResponse = {
      id,
      result: {
        p: keys.p.toString(),
        q: keys.q.toString(),
        n: keys.n.toString(),
        e: keys.e.toString(),
        d: keys.d.toString(),
        phi: keys.phi.toString(),
        dp: keys.dp.toString(),
        dq: keys.dq.toString(),
        qinv: keys.qinv.toString(),
      },
      error: null,
    };
    self.postMessage(response);
  } catch (err) {
    self.postMessage({ id, result: null, error: String(err) });
  }
};
