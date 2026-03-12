'use server';

import { z } from 'zod';

/**
 * Goodreads API Client
 * Phase 2: Fetch book ratings and metadata from Goodreads
 */

const GOODREADS_API = 'https://www.goodreads.com/search/index.xml';

// Zod schema for Goodreads search response
const GoodreadsWorkSchema = z.object({
  id: z.coerce.number(),
  best_book: z.object({
    id: z.coerce.number(),
    title: z.string(),
    author: z.object({
      name: z.string(),
    }),
    image_url: z.string().optional(),
    publication_year: z.coerce.number().optional(),
  }).optional(),
  original_publication_year: z.coerce.number().optional(),
  ratings_sum: z.coerce.number().optional(),
  ratings_count: z.coerce.number().optional(),
  average_rating: z.coerce.string().transform(val => parseFloat(val)).optional(),
}).passthrough();

export type GoodreadsWork = z.infer<typeof GoodreadsWorkSchema>;

/**
 * Search Goodreads for a comic book by title
 * Returns the most relevant match with ratings
 */
export async function searchGoodreads(
  query: string,
  limit: number = 5
): Promise<GoodreadsWork | null> {
  try {
    const url = new URL(GOODREADS_API);
    url.searchParams.set('q', query);
    url.searchParams.set('key', 'YOUR_API_KEY'); // Note: Goodreads API deprecated in 2023, see note below

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`Goodreads search failed: ${res.status}`);
      return null;
    }

    const xmlText = await res.text();

    // Simple XML parsing (Goodreads returns XML)
    // In production, use xml2js or similar
    const workMatch = xmlText.match(/<work>([\s\S]*?)<\/work>/);
    if (!workMatch) return null;

    // Extract key fields via regex for prototype
    const idMatch = xmlText.match(/<id[^>]*>(\d+)<\/id>/);
    const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/);
    const ratingMatch = xmlText.match(/<average_rating>([0-9.]+)<\/average_rating>/);
    const ratingCountMatch = xmlText.match(/<ratings_count[^>]*>(\d+)<\/ratings_count>/);

    if (!idMatch || !titleMatch) return null;

    return {
      id: parseInt(idMatch[1]),
      best_book: {
        id: parseInt(idMatch[1]),
        title: titleMatch[1],
        author: { name: 'Unknown' },
      },
      average_rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
      ratings_count: ratingCountMatch ? parseInt(ratingCountMatch[1]) : undefined,
    };
  } catch (error) {
    console.error('Goodreads search error:', error);
    return null;
  }
}

/**
 * Alternative: ISBNdb integration
 * More reliable than Goodreads (which deprecated their public API in 2023)
 * Free tier available with API key signup at isbndb.com
 */
export async function searchISBNdb(
  isbn: string,
  apiKey?: string
): Promise<{
  title: string;
  authors: string[];
  rating?: number;
  review_count?: number;
} | null> {
  if (!apiKey) {
    console.warn('ISBNdb API key not configured');
    return null;
  }

  try {
    const res = await fetch(`https://api2.isbndb.com/book/${isbn}`, {
      headers: {
        'Authorization': apiKey,
        'User-Agent': 'Vidiai-Longbox/1.0',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();

    return {
      title: data.title,
      authors: data.authors || [],
      rating: data.rating,
      review_count: data.pages_count,
    };
  } catch (error) {
    console.error('ISBNdb search error:', error);
    return null;
  }
}

/**
 * Fallback approach: ComicGlossary or user-provided data
 * Since Goodreads deprecated official API in 2023, we rely on:
 * 1. ComicVine (already integrated)
 * 2. User ratings in our own system (via book_reviews table)
 * 3. League of Comic Geeks (has public ratings but no official API)
 */
export async function getComicGlossaryRating(
  seriesName: string,
  issueNumber?: string
): Promise<{ rating: number; reviewCount: number } | null> {
  try {
    // ComicGlossary.com has reviews but no public API
    // Would require web scraping or partnership
    // For now, return null - this is a placeholder for future integration
    console.debug('ComicGlossary integration pending');
    return null;
  } catch (error) {
    console.error('ComicGlossary fetch error:', error);
    return null;
  }
}

/**
 * Get League of Comic Geeks rating (has public data but no official API)
 * Requires web scraping via cheerio/jsdom
 */
export async function getLeagueOfComicGeeksRating(
  comicName: string
): Promise<{ rating: number; votes: number } | null> {
  try {
    // League of Comic Geeks has ratings but no public API
    // Would require web scraping
    // Placeholder for future implementation
    console.debug('League of Comic Geeks scraping pending');
    return null;
  } catch (error) {
    console.error('Comic Geeks fetch error:', error);
    return null;
  }
}

/**
 * Summary: Rating Sources After Goodreads Deprecation (2023)
 *
 * ✅ Available (with API):
 * - ComicVine (already integrated)
 * - ISBNdb (needs API key)
 * - OpenLibrary (free, no key needed)
 *
 * ⚠️ Web Scraping Required:
 * - Goodreads (no official API, deprecated)
 * - League of Comic Geeks
 * - ComicGlossary
 *
 * Recommendation: Use OpenLibrary as fallback (ISBN lookup)
 */
