import "server-only";

/**
 * Fixed-window rate limiter backed by an in-process Map.
 *
 * Scope and limits: this protects a single Node instance. It is the correct
 * primitive for the clinic's Phase-1 single-server deployment and for blunting
 * credential stuffing and upload spam. If the platform is ever scaled to
 * multiple instances behind a load balancer, replace `buckets` with a Redis
 * INCR + EXPIRE pair - the exported API does not need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Evict expired buckets so a long-running process does not leak memory. */
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets; 0 when the request was allowed. */
  retryAfterSeconds: number;
}

export interface RateLimitRule {
  /** Maximum requests permitted inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** Named rules, so limits are declared in one place and reviewed together. */
export const RateLimits = {
  login: { limit: 8, windowSeconds: 300 },
  register: { limit: 5, windowSeconds: 3600 },
  booking: { limit: 12, windowSeconds: 600 },
  receiptUpload: { limit: 10, windowSeconds: 3600 },
  adminReview: { limit: 120, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Consume one unit from `identifier`'s bucket.
 *
 * @param identifier stable caller key - prefer `userId` when authenticated and
 *                   fall back to the client IP, prefixed by the action name so
 *                   different actions do not share a budget.
 */
export function consumeRateLimit(identifier: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: rule.limit - existing.count, retryAfterSeconds: 0 };
}

/**
 * Clear a bucket after a successful attempt, so one genuine login does not leave
 * a legitimate user near the throttle ceiling.
 */
export function resetRateLimit(identifier: string): void {
  buckets.delete(identifier);
}
