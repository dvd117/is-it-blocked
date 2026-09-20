type Bucket = { tokens: number; lastRefill: number };

const STALE_MS = 60 * 60 * 1000;
let lastSweep = Date.now();

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (now - lastSweep < STALE_MS) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_MS) buckets.delete(key);
  }
  lastSweep = now;
}

export function rateLimit(key: string, capacity: number, refillPerSec: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now };
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSec);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

function asIp(value: string | null | undefined): string | null {
  const candidate = value?.trim() ?? "";
  if (!candidate) return null;
  if (IPV4.test(candidate) && candidate.split(".").every((o) => Number(o) <= 255)) return candidate;
  if (candidate.includes(":") && IPV6.test(candidate)) return candidate;
  return null;
}

// Deflect writes the real visitor IP into True-Client-IP / X-Deflect-Client-IP.
// X-Real-IP on this infrastructure carries the EDGE address, not the visitor,
// so reading it buckets every visitor together. And the leftmost X-Forwarded-For
// entry is client-supplied, so trusting it lets anyone pick their own bucket and
// walk past the limit; the rightmost entry is the one our own proxy appended.
export function clientKey(request: Request): string {
  const edge =
    asIp(request.headers.get("true-client-ip")) ??
    asIp(request.headers.get("x-deflect-client-ip"));
  if (edge) return edge;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded.split(",");
    const nearest = asIp(entries[entries.length - 1]);
    if (nearest) return nearest;
  }

  return "anonymous";
}
