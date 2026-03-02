'use server'

import { unifiedSearch } from '@/lib/search-service';

export type SearchResult = {
  id: string;
  title: string;
  year: number;
  publisher: string;
  image?: string;
  source: 'local' | 'remote';
  url: string;
};

/**
 * Smart search for autocomplete dropdown
 * Uses the unified search service with limited results for fast responses
 */
export async function smartSearch(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  // Use unified search service with limits for autocomplete
  const { localResults, remoteResults } = await unifiedSearch(query, {
    includeIssueCount: false, // Don't need issue count for autocomplete
    localLimit: 5,
    remoteLimit: 5,
  });

  // Format for autocomplete UI
  const formattedLocal: SearchResult[] = localResults.map(item => ({
    id: item.id,
    title: item.name,
    year: item.year || 0,
    publisher: item.publisher || 'Unknown',
    image: item.thumbnail_url || undefined,
    source: 'local',
    url: `/series/${item.id}`
  }));

  const formattedRemote: SearchResult[] = remoteResults.map(item => ({
    id: item.id,
    title: item.name,
    year: item.year || 0,
    publisher: item.publisher || 'Unknown',
    image: item.thumbnail_url || undefined,
    source: 'remote',
    url: `/series/${item.cv_id}`
  }));

  return [...formattedLocal, ...formattedRemote];
}

