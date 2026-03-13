/**
 * Edge Function rate limiting utility.
 * Uses in-memory store (resets on cold start) — sufficient for per-instance protection.
 * For production-grade rate limiting, use a Redis/KV store.
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number | null;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Cleanup expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowSec * 1000 });
    return { allowed: true, remaining: options.maxRequests - 1, retryAfterSec: null };
  }

  if (entry.count >= options.maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  entry.count++;
  return { allowed: true, remaining: options.maxRequests - entry.count, retryAfterSec: null };
}

export function rateLimitResponse(retryAfterSec: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later.", retryAfterSec }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

/** Rate limit configs by function category */
export const RATE_LIMITS = {
  ai_analysis: { maxRequests: 5, windowSec: 60 },        // 5/min
  ai_generation: { maxRequests: 3, windowSec: 60 },       // 3/min
  report_generation: { maxRequests: 2, windowSec: 60 },    // 2/min
  chat: { maxRequests: 30, windowSec: 60 },                // 30/min
  import: { maxRequests: 2, windowSec: 300 },              // 2/5min
  payment: { maxRequests: 5, windowSec: 60 },              // 5/min
  public_mutation: { maxRequests: 10, windowSec: 60 },     // 10/min
} as const;
