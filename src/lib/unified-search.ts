/**
 * Unified Search Aggregator
 *
 * Combines search results from multiple comic data sources:
 * 1. ComicVine (Primary) - Series/volume matching
 * 2. Metron (Secondary) - Issue details, credits
 * 3. Local Library - Books already in the collection
 *
 * Results are merged and deduplicated with confidence scoring.
 */

import { searchComicVine } from './comicvine';
import { searchMetronSeries, isMetronConfigured, type MetronSeries } from './metron';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { ilike, or, sql } from 'drizzle-orm';

export interface UnifiedSearchResult {
  id: string;
  name: string;
  publisher: string | null;
  year: number | null;
  description: string | null;
  thumbnail: string | null;
  issueCount: number | null;
  source: 'comicvine' | 'metron' | 'local';
  sourceId: number | string;
  confidence: number; // 0-100 match confidence
  inLibrary: boolean;
  localSeriesId?: string;
}

export interface UnifiedSearchOptions {
  limit?: number;
  includeLocal?: boolean;
  includeComicVine?: boolean;
  includeMetron?: boolean;
}

const DEFAULT_OPTIONS: UnifiedSearchOptions = {
  limit: 20,
  includeLocal: true,
  includeComicVine: true,
  includeMetron: true,
};

/**
 * Search across all configured sources
 */
export async function unifiedSearch(
  query: string,
  options: UnifiedSearchOptions = {}
): Promise<UnifiedSearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: UnifiedSearchResult[] = [];

  // Parallel search across all sources
  const searches: Promise<void>[] = [];

  // 1. Local library search
  if (opts.includeLocal) {
    searches.push(
      searchLocalLibrary(query).then(localResults => {
        results.push(...localResults);
      })
    );
  }

  // 2. ComicVine search
  if (opts.includeComicVine) {
    searches.push(
      searchComicVine(query, opts.limit).then(cvResults => {
        const mapped = cvResults.map(cv => mapComicVineResult(cv));
        results.push(...mapped);
      }).catch(err => {
        console.warn('[UNIFIED] ComicVine search failed:', err);
      })
    );
  }

  // 3. Metron search (if configured)
  if (opts.includeMetron) {
    const metronAvailable = await isMetronConfigured();
    if (metronAvailable) {
      searches.push(
        searchMetronSeries(query, opts.limit).then(metronResults => {
          const mapped = metronResults.map(m => mapMetronResult(m));
          results.push(...mapped);
        }).catch(err => {
          console.warn('[UNIFIED] Metron search failed:', err);
        })
      );
    }
  }

  await Promise.all(searches);

  // Deduplicate and merge results
  const merged = deduplicateResults(results);

  // Mark items that exist in local library
  await markLocalMatches(merged);

  // Sort by confidence then by name
  merged.sort((a, b) => {
    // Local items first if in library
    if (a.inLibrary && !b.inLibrary) return -1;
    if (!a.inLibrary && b.inLibrary) return 1;
    // Then by confidence
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });

  return merged.slice(0, opts.limit);
}

/**
 * Search local library for series
 */
async function searchLocalLibrary(query: string): Promise<UnifiedSearchResult[]> {
  try {
    const localSeries = await db
      .select({
        id: series.id,
        name: series.name,
        publisher: series.publisher,
        year: series.year,
        description: series.description,
        thumbnail: series.thumbnail_url,
        cvId: series.cv_id,
        metronId: series.metron_id,
        bookCount: sql<number>`(SELECT COUNT(*) FROM books WHERE books.series_id = ${series.id})`,
      })
      .from(series)
      .where(
        or(
          ilike(series.name, `%${query}%`),
          ilike(series.publisher, `%${query}%`)
        )
      )
      .limit(20);

    return localSeries.map(s => ({
      id: `local-${s.id}`,
      name: s.name,
      publisher: s.publisher,
      year: s.year,
      description: s.description,
      thumbnail: s.thumbnail,
      issueCount: s.bookCount,
      source: 'local' as const,
      sourceId: s.id,
      confidence: 100, // Exact match in library
      inLibrary: true,
      localSeriesId: s.id,
    }));
  } catch (error) {
    console.error('[UNIFIED] Local search error:', error);
    return [];
  }
}

/**
 * Map ComicVine result to unified format
 */
function mapComicVineResult(cv: {
  id: number;
  name: string;
  start_year?: string | null;
  publisher?: { name: string } | null;
  image?: { medium_url: string } | null;
  description?: string | null;
  count_of_issues?: number;
}): UnifiedSearchResult {
  return {
    id: `cv-${cv.id}`,
    name: cv.name,
    publisher: cv.publisher?.name || null,
    year: cv.start_year ? parseInt(cv.start_year, 10) : null,
    description: cv.description || null,
    thumbnail: cv.image?.medium_url || null,
    issueCount: cv.count_of_issues || null,
    source: 'comicvine',
    sourceId: cv.id,
    confidence: 80, // Default confidence for external sources
    inLibrary: false,
  };
}

/**
 * Map Metron result to unified format
 */
function mapMetronResult(m: MetronSeries): UnifiedSearchResult {
  return {
    id: `metron-${m.id}`,
    name: m.name,
    publisher: m.publisher?.name || null,
    year: m.year_began || null,
    description: null, // Metron doesn't provide description in search
    thumbnail: m.image || null,
    issueCount: m.issue_count || null,
    source: 'metron',
    sourceId: m.id,
    confidence: 75, // Slightly lower than ComicVine
    inLibrary: false,
  };
}

/**
 * Deduplicate results by matching name + publisher + year
 */
function deduplicateResults(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
  const seen = new Map<string, UnifiedSearchResult>();

  for (const result of results) {
    // Create a normalized key for deduplication
    const key = normalizeKey(result.name, result.publisher, result.year);

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, result);
    } else {
      // Merge: prefer local, then ComicVine, then Metron
      if (result.source === 'local' ||
         (result.source === 'comicvine' && existing.source === 'metron')) {
        // Keep the better source but merge data
        const merged = {
          ...result,
          // Fill in missing data from other source
          description: result.description || existing.description,
          thumbnail: result.thumbnail || existing.thumbnail,
          issueCount: result.issueCount || existing.issueCount,
        };
        seen.set(key, merged);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Create normalized key for deduplication
 */
function normalizeKey(name: string, publisher: string | null, year: number | null): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedPublisher = publisher?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  return `${normalizedName}:${normalizedPublisher}:${year || ''}`;
}

/**
 * Mark results that exist in local library by CV/Metron ID
 */
async function markLocalMatches(results: UnifiedSearchResult[]): Promise<void> {
  // Get all CV and Metron IDs from results
  const cvIds = results
    .filter(r => r.source === 'comicvine')
    .map(r => r.sourceId as number);

  const metronIds = results
    .filter(r => r.source === 'metron')
    .map(r => r.sourceId as number);

  if (cvIds.length === 0 && metronIds.length === 0) return;

  try {
    // Find local series with matching external IDs
    const localMatches = await db
      .select({
        id: series.id,
        cvId: series.cv_id,
        metronId: series.metron_id,
      })
      .from(series)
      .where(
        or(
          cvIds.length > 0 ? sql`${series.cv_id} IN ${cvIds}` : undefined,
          metronIds.length > 0 ? sql`${series.metron_id} IN ${metronIds}` : undefined
        )
      );

    // Create lookup maps
    const cvIdToLocalId = new Map<number, string>();
    const metronIdToLocalId = new Map<number, string>();

    for (const match of localMatches) {
      if (match.cvId) cvIdToLocalId.set(match.cvId, match.id);
      if (match.metronId) metronIdToLocalId.set(match.metronId, match.id);
    }

    // Mark results
    for (const result of results) {
      if (result.source === 'comicvine') {
        const localId = cvIdToLocalId.get(result.sourceId as number);
        if (localId) {
          result.inLibrary = true;
          result.localSeriesId = localId;
          result.confidence = 95; // High confidence since it's linked
        }
      } else if (result.source === 'metron') {
        const localId = metronIdToLocalId.get(result.sourceId as number);
        if (localId) {
          result.inLibrary = true;
          result.localSeriesId = localId;
          result.confidence = 95;
        }
      }
    }
  } catch (error) {
    console.error('[UNIFIED] Error marking local matches:', error);
  }
}

/**
 * Get search source statistics
 */
export interface SearchSourceStats {
  comicVine: { enabled: boolean; available: boolean };
  metron: { enabled: boolean; available: boolean };
  local: { enabled: boolean; seriesCount: number };
}

export async function getSearchSourceStats(): Promise<SearchSourceStats> {
  const metronAvailable = await isMetronConfigured();

  let localCount = 0;
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(series);
    localCount = result[0]?.count || 0;
  } catch {
    // ignore
  }

  return {
    comicVine: { enabled: true, available: true },
    metron: { enabled: true, available: metronAvailable },
    local: { enabled: true, seriesCount: localCount },
  };
}
