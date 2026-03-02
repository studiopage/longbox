import { z } from 'zod';
import { getSettings } from '@/actions/settings';

const BASE_URL = 'https://metron.cloud/api';

// Zod Schemas for Metron API responses
const MetronPublisherSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const MetronSeriesSchema = z.object({
  id: z.number(),
  name: z.string(),
  sort_name: z.string().optional(),
  volume: z.number().optional(),
  year_began: z.number().nullable().optional(),
  year_end: z.number().nullable().optional(),
  issue_count: z.number().optional(),
  publisher: MetronPublisherSchema.optional(),
  series_type: z.object({ name: z.string() }).optional(),
  status: z.string().optional(),
  image: z.string().nullable().optional(),
});

const MetronCreatorSchema = z.object({
  id: z.number(),
  creator: z.string(),
  role: z.array(z.object({ name: z.string() })),
});

const MetronArcSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const MetronIssueSchema = z.object({
  id: z.number(),
  series: z.object({
    id: z.number(),
    name: z.string(),
  }),
  number: z.string(),
  title: z.string().nullable().optional(),
  cover_date: z.string().nullable().optional(),
  store_date: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  upc: z.string().nullable().optional(),
  page_count: z.number().nullable().optional(),
  desc: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  credits: z.array(MetronCreatorSchema).optional(),
  arcs: z.array(MetronArcSchema).optional(),
  characters: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  teams: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
});

const MetronSearchResultSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(MetronSeriesSchema),
});

const MetronIssueSearchResultSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(MetronIssueSchema),
});

export type MetronSeries = z.infer<typeof MetronSeriesSchema>;
export type MetronIssue = z.infer<typeof MetronIssueSchema>;
export type MetronCreator = z.infer<typeof MetronCreatorSchema>;

// Rate limiting: 30 requests per minute
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests (30/min = 1 per 2s)

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

// Get Metron credentials from settings
async function getMetronAuth(): Promise<string | null> {
  const settings = await getSettings();
  const username = settings?.metron_username;
  const apiKey = settings?.metron_api_key;

  if (!username || !apiKey) return null;

  // Basic auth: base64(username:apiKey)
  return Buffer.from(`${username}:${apiKey}`).toString('base64');
}

/**
 * Search for series on Metron
 */
export async function searchMetronSeries(query: string, limit: number = 10): Promise<MetronSeries[]> {
  const auth = await getMetronAuth();
  if (!auth) {
    console.log('[METRON] No credentials configured');
    return [];
  }

  const url = `${BASE_URL}/series/?name=${encodeURIComponent(query)}`;

  try {
    const res = await rateLimitedFetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Longbox/1.0',
      },
    });

    if (!res.ok) {
      console.error('[METRON] Search failed:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    const parsed = MetronSearchResultSchema.parse(data);
    return parsed.results.slice(0, limit);
  } catch (error) {
    console.error('[METRON] Search error:', error);
    return [];
  }
}

/**
 * Get a specific series by ID
 */
export async function getMetronSeries(seriesId: number): Promise<MetronSeries | null> {
  const auth = await getMetronAuth();
  if (!auth) return null;

  const url = `${BASE_URL}/series/${seriesId}/`;

  try {
    const res = await rateLimitedFetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Longbox/1.0',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return MetronSeriesSchema.parse(data);
  } catch (error) {
    console.error('[METRON] Get series error:', error);
    return null;
  }
}

/**
 * Search for issues in a series
 */
export async function getMetronIssues(seriesId: number): Promise<MetronIssue[]> {
  const auth = await getMetronAuth();
  if (!auth) return [];

  const url = `${BASE_URL}/issue/?series_id=${seriesId}`;

  try {
    const res = await rateLimitedFetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Longbox/1.0',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const parsed = MetronIssueSearchResultSchema.parse(data);
    return parsed.results;
  } catch (error) {
    console.error('[METRON] Get issues error:', error);
    return [];
  }
}

/**
 * Get a specific issue by ID with full details (credits, arcs, etc.)
 */
export async function getMetronIssue(issueId: number): Promise<MetronIssue | null> {
  const auth = await getMetronAuth();
  if (!auth) return null;

  const url = `${BASE_URL}/issue/${issueId}/`;

  try {
    const res = await rateLimitedFetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Longbox/1.0',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return MetronIssueSchema.parse(data);
  } catch (error) {
    console.error('[METRON] Get issue error:', error);
    return null;
  }
}

/**
 * Search for an issue by series name and issue number
 * Useful for matching local files to Metron data
 */
export async function findMetronIssue(
  seriesName: string,
  issueNumber: string
): Promise<MetronIssue | null> {
  // First, search for the series
  const seriesResults = await searchMetronSeries(seriesName, 5);

  if (seriesResults.length === 0) return null;

  // Try to find the issue in each matching series
  for (const series of seriesResults) {
    const issues = await getMetronIssues(series.id);

    // Normalize issue number for comparison
    const normalizedTarget = normalizeIssueNumber(issueNumber);

    const match = issues.find(issue =>
      normalizeIssueNumber(issue.number) === normalizedTarget
    );

    if (match) {
      // Get full issue details
      return getMetronIssue(match.id);
    }
  }

  return null;
}

/**
 * Normalize issue numbers for comparison
 * "001" -> "1", "1.0" -> "1", etc.
 */
function normalizeIssueNumber(num: string): string {
  // Remove leading zeros and trailing .0
  return num.replace(/^0+/, '').replace(/\.0+$/, '') || '0';
}

/**
 * Format credits for display
 */
export function formatCredits(credits: MetronCreator[]): string {
  return credits
    .map(c => `${c.creator} (${c.role.map(r => r.name).join(', ')})`)
    .join('; ');
}

/**
 * Check if Metron is configured
 */
export async function isMetronConfigured(): Promise<boolean> {
  const auth = await getMetronAuth();
  return auth !== null;
}
