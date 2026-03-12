import { z } from 'zod';

/**
 * OpenLibrary API Client
 * Phase 2: Free ISBN/title lookups with ratings from community
 * No API key required
 */

const OPEN_LIBRARY_API = 'https://openlibrary.org/api';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';

// Schema for OpenLibrary search result
const OpenLibraryDocSchema = z.object({
  title: z.string(),
  author_name: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
  isbn: z.array(z.string()).optional(),
  isbn13: z.array(z.string()).optional(),
  cover_i: z.number().optional(),
  publisher: z.array(z.string()).optional(),
  ratings_average: z.number().optional(),
  ratings_count: z.number().optional(),
}).passthrough();

export type OpenLibraryDoc = z.infer<typeof OpenLibraryDocSchema>;

/**
 * Search OpenLibrary by title
 * Returns first result with ratings if available
 */
export async function searchOpenLibrary(
  query: string
): Promise<OpenLibraryDoc | null> {
  try {
    const url = new URL(OPEN_LIBRARY_SEARCH);
    url.searchParams.set('title', query);
    url.searchParams.set('limit', '5');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`OpenLibrary search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    // Parse and return first result
    const parsed = z.array(OpenLibraryDocSchema).safeParse(data.docs);
    if (!parsed.success) return null;

    return parsed.data[0];
  } catch (error) {
    console.error('OpenLibrary search error:', error);
    return null;
  }
}

/**
 * Look up book by ISBN (works for graphic novels and comics too)
 */
export async function searchOpenLibraryByISBN(
  isbn: string
): Promise<OpenLibraryDoc | null> {
  try {
    const url = new URL(OPEN_LIBRARY_SEARCH);
    url.searchParams.set('isbn', isbn);
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const parsed = z.array(OpenLibraryDocSchema).safeParse(data.docs);
    if (!parsed.success) return null;

    return parsed.data[0];
  } catch (error) {
    console.error('OpenLibrary ISBN lookup error:', error);
    return null;
  }
}

/**
 * Get cover image URL from OpenLibrary
 * Docs: https://openlibrary.org/dev/docs/api/covers
 */
export function getOpenLibraryCoverUrl(
  coverId: number,
  size: 'S' | 'M' | 'L' = 'M'
): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/**
 * Rating sources that OpenLibrary provides:
 * - Community ratings (averaged from users)
 * - Works with ISBN/title/author searches
 *
 * For comics specifically:
 * - Search works best with series name + issue number
 * - Example: "Spider-Man #1" or ISBN if available
 */
