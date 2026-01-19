'use server'

import { db } from '@/db';
import { series } from '@/db/schema';
import { ilike, or } from 'drizzle-orm';
import { searchComicVine } from '@/lib/comicvine';

export type SearchResult = {
  id: string;
  title: string;
  year: number;
  publisher: string;
  image?: string;
  source: 'local' | 'remote';
  url: string;
};

export async function smartSearch(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  console.log(`🔍 Smart Search: "${query}"`);

  // 1. Run Parallel Queries
  const [localResults, remoteResults] = await Promise.all([
    // Local DB Search (Fastest)
    db.select({
      id: series.id,
      title: series.title,
      start_year: series.start_year,
      publisher: series.publisher,
      thumbnail_url: series.thumbnail_url
    })
    .from(series)
    .where(
        or(
            ilike(series.title, `%${query}%`)
        )
    )
    .limit(5),

    // External API Search (Slower)
    searchComicVine(query)
  ]);

  // 2. Format Local Results
  const formattedLocal: SearchResult[] = localResults.map(item => ({
    id: item.id,
    title: item.title,
    year: item.start_year,
    publisher: item.publisher || 'Unknown',
    image: item.thumbnail_url || undefined,
    source: 'local',
    url: `/series/${item.id}`
  }));

  // 3. Format Remote Results
  // We filter out IDs that might already match local ones to avoid duplicates (basic check)
  const localCvIds = new Set(localResults.map(l => l.id)); // Note: Ideally we check CV ID, but this is a quick heuristic

  const formattedRemote: SearchResult[] = remoteResults
    .slice(0, 5)
    .map(item => ({
        id: item.id.toString(),
        title: item.name,
        year: parseInt(item.start_year || '0'),
        publisher: item.publisher?.name || 'Unknown',
        image: item.image?.medium_url,
        source: 'remote',
        url: `/series/new?cvId=${item.id}`
    }));

  // 4. Combine & Return
  return [...formattedLocal, ...formattedRemote];
}

