// Dedicated Web Worker for memory-hard hashing (Argon2id)
// WASM module loaded once on worker init, reused across calls

let argon2idFn: typeof import('hash-wasm').argon2id | null = null;

// Load WASM module once on worker startup
async function init() {
  const { argon2id } = await import('hash-wasm');
  argon2idFn = argon2id;
  self.postMessage({ type: 'ready' });
}

init();

self.onmessage = async (e: MessageEvent) => {
  const { id, password, salt, memorySize, iterations, parallelism, hashLength } = e.data;

  if (!argon2idFn) {
    self.postMessage({ id, error: 'WASM not loaded yet', result: null });
    return;
  }

  try {
    const t0 = performance.now();
    const hash = await argon2idFn({
      password,
      salt,
      parallelism,
      iterations,
      memorySize,
      hashLength,
      outputType: 'hex',
    });
    const timeMs = performance.now() - t0;

    self.postMessage({
      id,
      result: { hash, timeMs: Math.round(timeMs), memorySize },
      error: null,
    });
  } catch (err) {
    self.postMessage({ id, result: null, error: String(err) });
  }
};
