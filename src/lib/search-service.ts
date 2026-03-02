'use server'

import { db } from '@/db';
import { series, books } from '@/db/schema';
import { ilike, sql } from 'drizzle-orm';
import { searchComicVine } from '@/lib/comicvine';

/**
 * Simple ComicVine-only search action
 * Replaces the duplicate search.ts and search-cv.ts actions
 */
export async function searchComicVineOnly(query: string, limit?: number) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  return await searchComicVine(query, limit);
}

export type SearchResultItem = {
  id: string;
  name: string;
  publisher: string | null;
  year: number | null;
  description: string | null;
  status: string | null;
  thumbnail_url: string | null;
  cv_id: number | null;
  issue_count?: number;
  source: 'local' | 'remote';
  start_year?: number;
};

export interface SearchOptions {
  includeIssueCount?: boolean;
  localLimit?: number;
  remoteLimit?: number;
}

/**
 * Unified search service used by both smart search (autocomplete) and advanced search
 * This ensures consistent results across the application
 */
export async function unifiedSearch(
  query: string,
  options: SearchOptions = {}
): Promise<{
  localResults: SearchResultItem[];
  remoteResults: SearchResultItem[];
}> {
  if (query.length < 2) {
    return { localResults: [], remoteResults: [] };
  }

  const {
    includeIssueCount = false,
    localLimit,
    remoteLimit = 50,
  } = options;

  console.log(`🔍 Unified Search: "${query}" (issue_count: ${includeIssueCount}, limits: ${localLimit}/${remoteLimit})`);

  // Build local query
  let localQuery;

  if (includeIssueCount) {
    // Advanced search query with issue count
    localQuery = db
      .select({
        id: series.id,
        name: series.name,
        publisher: series.publisher,
        year: series.year,
        description: series.description,
        status: series.status,
        thumbnail_url: series.thumbnail_url,
        cv_id: series.cv_id,
        issue_count: sql<number>`count(${books.id})`.mapWith(Number),
      })
      .from(series)
      .leftJoin(books, sql`${series.id} = ${books.series_id}`)
      .where(ilike(series.name, `%${query}%`))
      .groupBy(
        series.id,
        series.name,
        series.publisher,
        series.year,
        series.description,
        series.status,
        series.thumbnail_url,
        series.cv_id
      );
  } else {
    // Quick search query without joins
    localQuery = db
      .select({
        id: series.id,
        name: series.name,
        publisher: series.publisher,
        year: series.year,
        description: series.description,
        status: series.status,
        thumbnail_url: series.thumbnail_url,
        cv_id: series.cv_id,
      })
      .from(series)
      .where(ilike(series.name, `%${query}%`));
  }

  // Apply limit if specified
  if (localLimit) {
    localQuery = localQuery.limit(localLimit);
  }

  // Execute parallel queries
  const [localDbResults, remoteApiResults] = await Promise.all([
    localQuery,
    searchComicVine(query, remoteLimit),
  ]);

  // Format local results
  const localResults: SearchResultItem[] = localDbResults.map((item) => ({
    ...item,
    source: 'local' as const,
  }));

  // Format remote results
  const remoteResults: SearchResultItem[] = remoteApiResults.map((item) => ({
    id: item.id.toString(),
    name: item.name,
    publisher: item.publisher?.name || null,
    year: item.start_year ? parseInt(item.start_year) : null,
    description: item.description || null,
    status: null,
    thumbnail_url: item.image?.medium_url || null,
    cv_id: item.id,
    issue_count: item.count_of_issues || 0,
    source: 'remote' as const,
  }));

  return { localResults, remoteResults };
}
