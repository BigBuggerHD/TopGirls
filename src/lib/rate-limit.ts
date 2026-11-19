import "server-only";

/**
 * Einfaches In-Memory-Rate-Limiting (Sliding Window).
 * Für Mehrinstanz-Betrieb durch Redis o. Ä. ersetzen (gleiche Schnittstelle).
 */
type Bucket = { hits: number[] };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    store.set(key, bucket);
    return { ok: false, retryAfterMs: windowMs - (now - bucket.hits[0]) };
  }
  bucket.hits.push(now);
  store.set(key, bucket);
  if (store.size > 50_000) {
    for (const [k, b] of store) if (b.hits.every((t) => now - t > windowMs)) store.delete(k);
  }
  return { ok: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
