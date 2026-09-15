// In-memory rate limiter for the bid endpoint (per user + per IP).
// Simple sliding-window counter. In production this would be Redis-backed;
// the interface is kept swappable.

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

const DEFAULT_MAX = 10; // bids per window
const DEFAULT_WINDOW_MS = 10_000; // 10 seconds

function keyFor(userId: string | null, ip: string | null): string {
  return `${userId ?? "anon"}:${ip ?? "unknown"}`;
}

export function checkRateLimit(
  userId: string | null,
  ip: string | null,
  opts?: { max?: number; windowMs?: number },
): RateLimitResult {
  const max = opts?.max ?? DEFAULT_MAX;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const key = keyFor(userId, ip);
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    const retryAfterMs = windowMs - (now - bucket.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
}

// Used by tests to reset state.
export function resetRateLimiter(): void {
  buckets.clear();
}
