/**
 * Shared ComicVine utility for UI components
 * Reuses the existing ComicVine client logic
 */

import { searchComicVine } from '@/lib/comicvine';

export interface ComicResult {
  id: string;
  name: string;
  start_year: string | null;
  count_of_issues: number;
  publisher: { name: string } | null;
  image: { 
    icon_url: string; 
    medium_url: string; // High-quality cover for visual matching
  } | null;
  description?: string;
}

export const searchComicVineForUI = async (query: string): Promise<ComicResult[]> => {
  if (!query || query.trim().length === 0) return [];
  
  try {
    const results = await searchComicVine(query, 20); // Get more results for manual selection
    
    return results.map((r: any) => ({
      id: r.id.toString(),
      name: r.name,
      start_year: r.start_year || null,
      count_of_issues: r.count_of_issues || 0,
      publisher: r.publisher || null,
      image: r.image || null, // Includes both icon_url and medium_url
      description: r.description || null
    }));
  } catch (error) {
    console.error("ComicVine Search Error:", error);
    return [];
  }
};

