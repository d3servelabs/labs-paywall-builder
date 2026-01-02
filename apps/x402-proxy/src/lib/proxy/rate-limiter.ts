/**
 * Rate Limiter
 * 
 * Implements a sliding window rate limiting algorithm.
 * Uses in-memory storage (suitable for single instance).
 * For multi-instance deployment, consider using Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

// In-memory storage for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check if a request is allowed based on rate limiting
 * 
 * @param key - Unique identifier for the rate limit (e.g., endpoint ID)
 * @param limitPerSecond - Maximum requests per second
 * @param windowMs - Time window in milliseconds (default 1000ms = 1 second)
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  limitPerSecond: number,
  windowMs = 1000
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now };
    rateLimitStore.set(key, entry);
  }

  // Clean up old timestamps (outside the window)
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // Check if allowed
  const currentCount = entry.timestamps.length;
  const allowed = currentCount < limitPerSecond;

  if (allowed) {
    // Add current timestamp
    entry.timestamps.push(now);
  }

  // Calculate reset time (when the oldest request in window expires)
  const oldestTimestamp = entry.timestamps[0] || now;
  const resetAt = oldestTimestamp + windowMs;

  // Periodic cleanup of stale entries
  if (now - entry.lastCleanup > CLEANUP_INTERVAL) {
    cleanupStaleEntries();
    entry.lastCleanup = now;
  }

  return {
    allowed,
    remaining: Math.max(0, limitPerSecond - entry.timestamps.length),
    resetAt,
    limit: limitPerSecond,
  };
}

/**
 * Clean up entries that have no recent activity
 */
function cleanupStaleEntries(): void {
  const now = Date.now();
  const staleThreshold = 60 * 1000; // 1 minute

  for (const [key, entry] of rateLimitStore.entries()) {
    const mostRecentTimestamp = entry.timestamps[entry.timestamps.length - 1] || 0;
    if (now - mostRecentTimestamp > staleThreshold) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific key
 * Useful for testing or admin override
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit stats for a key
 */
export function getRateLimitStats(key: string, limitPerSecond: number): RateLimitResult {
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  const windowStart = now - 1000;

  if (!entry) {
    return {
      allowed: true,
      remaining: limitPerSecond,
      resetAt: now + 1000,
      limit: limitPerSecond,
    };
  }

  const recentTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
  const oldestTimestamp = recentTimestamps[0] || now;

  return {
    allowed: recentTimestamps.length < limitPerSecond,
    remaining: Math.max(0, limitPerSecond - recentTimestamps.length),
    resetAt: oldestTimestamp + 1000,
    limit: limitPerSecond,
  };
}

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: `Too many requests. Please retry after ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...getRateLimitHeaders(result),
      },
    }
  );
}
