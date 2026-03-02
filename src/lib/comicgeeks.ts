import { z } from 'zod';

/**
 * League of Comic Geeks API Client
 *
 * Note: This uses the unofficial API from League of Comic Geeks.
 * The API is rate-limited, so we implement caching and throttling.
 *
 * API documentation: https://github.com/marufamd/comicgeeks
 */

const BASE_URL = 'https://leagueofcomicgeeks.com/api';

// Zod Schemas for LoG responses
const LogSeriesSchema = z.object({
  id: z.number(),
  title: z.string(),
  publisher: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const LogIssueSchema = z.object({
  id: z.number(),
  series_id: z.number(),
  title: z.string(),
  issue_number: z.string().nullable().optional(),
  cover_date: z.string().nullable().optional(),
  store_date: z.string().nullable().optional(),
  cover_image: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const LogCommunityStatsSchema = z.object({
  pull_count: z.number().optional(),
  rating: z.number().nullable().optional(),
  review_count: z.number().optional(),
  want_count: z.number().optional(),
  own_count: z.number().optional(),
});

export type LogSeries = z.infer<typeof LogSeriesSchema>;
export type LogIssue = z.infer<typeof LogIssueSchema>;
export type LogCommunityStats = z.infer<typeof LogCommunityStatsSchema>;

export interface CommunityMetrics {
  rating: number | null;
  pullCount: number;
  reviewCount: number;
  wantCount: number;
  ownCount: number;
  popularity: 'hot' | 'trending' | 'normal';
}

// Simple in-memory cache (5 minute TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Rate limiting: be gentle with the unofficial API
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Longbox/1.0 (Comic Library Manager)',
    },
  });
}

/**
 * Search for series on League of Comic Geeks
 */
export async function searchLogSeries(query: string): Promise<LogSeries[]> {
  const cacheKey = `log_search_${query}`;
  const cached = getCached<LogSeries[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/search.php?keyword=${encodeURIComponent(query)}&type=series`;
    const res = await rateLimitedFetch(url);

    if (!res.ok) {
      console.warn('[LOG] Search failed:', res.status);
      return [];
    }

    const data = await res.json();

    // The API might return different structures
    const results = Array.isArray(data) ? data : data.results || [];
    const parsed = results
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: unknown) => {
        try {
          return LogSeriesSchema.parse(item);
        } catch {
          return null;
        }
      })
      .filter((item: LogSeries | null): item is LogSeries => item !== null);

    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('[LOG] Search error:', error);
    return [];
  }
}

/**
 * Get new releases for a specific week
 * @param date - Date in YYYY-MM-DD format (defaults to current week)
 */
export async function getNewReleases(date?: string): Promise<LogIssue[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const cacheKey = `log_releases_${targetDate}`;
  const cached = getCached<LogIssue[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/new-comics.php?date=${targetDate}`;
    const res = await rateLimitedFetch(url);

    if (!res.ok) return [];

    const data = await res.json();
    const results = Array.isArray(data) ? data : data.comics || [];

    const parsed = results
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: unknown) => {
        try {
          return LogIssueSchema.parse(item);
        } catch {
          return null;
        }
      })
      .filter((item: LogIssue | null): item is LogIssue => item !== null);

    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('[LOG] New releases error:', error);
    return [];
  }
}

/**
 * Get community stats for a specific issue
 * Note: This might require scraping or a different endpoint
 */
export async function getCommunityStats(issueId: number): Promise<CommunityMetrics | null> {
  const cacheKey = `log_stats_${issueId}`;
  const cached = getCached<CommunityMetrics>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/comic/${issueId}/stats`;
    const res = await rateLimitedFetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    const stats = LogCommunityStatsSchema.parse(data);

    const metrics: CommunityMetrics = {
      rating: stats.rating ?? null,
      pullCount: stats.pull_count ?? 0,
      reviewCount: stats.review_count ?? 0,
      wantCount: stats.want_count ?? 0,
      ownCount: stats.own_count ?? 0,
      popularity: calculatePopularity(stats.pull_count ?? 0),
    };

    setCache(cacheKey, metrics);
    return metrics;
  } catch (error) {
    console.error('[LOG] Community stats error:', error);
    return null;
  }
}

/**
 * Calculate popularity tier based on pull count
 */
function calculatePopularity(pullCount: number): 'hot' | 'trending' | 'normal' {
  if (pullCount > 10000) return 'hot';
  if (pullCount > 1000) return 'trending';
  return 'normal';
}

/**
 * Get trending series based on pull counts
 */
export async function getTrendingSeries(): Promise<LogSeries[]> {
  const cacheKey = 'log_trending';
  const cached = getCached<LogSeries[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/series/trending.php`;
    const res = await rateLimitedFetch(url);

    if (!res.ok) return [];

    const data = await res.json();
    const results = Array.isArray(data) ? data : data.series || [];

    const parsed = results
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: unknown) => {
        try {
          return LogSeriesSchema.parse(item);
        } catch {
          return null;
        }
      })
      .filter((item: LogSeries | null): item is LogSeries => item !== null);

    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('[LOG] Trending series error:', error);
    return [];
  }
}

/**
 * Format community metrics for display
 */
export function formatCommunityMetrics(metrics: CommunityMetrics): string {
  const parts: string[] = [];

  if (metrics.rating !== null) {
    parts.push(`${metrics.rating.toFixed(1)} stars`);
  }
  if (metrics.pullCount > 0) {
    parts.push(`${metrics.pullCount.toLocaleString()} pulls`);
  }
  if (metrics.reviewCount > 0) {
    parts.push(`${metrics.reviewCount} reviews`);
  }

  return parts.join(' • ') || 'No community data';
}

/**
 * Check if League of Comic Geeks API is accessible
 */
export async function isLogAccessible(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/publishers.php`, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Longbox/1.0' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
