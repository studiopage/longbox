/**
 * Simple in-memory rate limiter.
 * ComicVine: 1 request per second per API key (best practice).
 * Tracks request timestamps and enforces minimum delay between calls.
 */

const requestTimestamps = new Map<string, number[]>();

/**
 * Wait until it's safe to make another API request.
 * ComicVine limit: 1 request per second
 * 
 * @param key - Identifier (e.g., "comicvine")
 * @param minIntervalMs - Minimum milliseconds between requests (default 1000ms = 1 req/sec)
 */
export async function waitForRateLimit(key: string, minIntervalMs: number = 1000): Promise<void> {
  const now = Date.now();
  let timestamps = requestTimestamps.get(key) || [];

  // Clean up old timestamps (older than 10 seconds)
  timestamps = timestamps.filter(t => now - t < 10000);

  // If we have a recent request, wait until the minimum interval has passed
  if (timestamps.length > 0) {
    const lastRequest = timestamps[timestamps.length - 1];
    const timeSinceLastRequest = now - lastRequest;
    if (timeSinceLastRequest < minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, minIntervalMs - timeSinceLastRequest));
    }
  }

  // Record this request
  timestamps.push(Date.now());
  requestTimestamps.set(key, timestamps);
}

/**
 * Get the number of requests made to a key in the last 10 seconds.
 */
export function getRecentRequestCount(key: string): number {
  const now = Date.now();
  const timestamps = requestTimestamps.get(key) || [];
  return timestamps.filter(t => now - t < 10000).length;
}

/**
 * Reset the rate limiter for a key (useful for testing).
 */
export function resetRateLimiter(key: string): void {
  requestTimestamps.delete(key);
}
