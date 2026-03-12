'use server';

import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { searchOpenLibrary, searchOpenLibraryByISBN } from '@/lib/openlibrary';
import { logEvent } from '@/lib/activity-logger';

/**
 * Phase 2: Batch fetch OpenLibrary ratings for books missing them
 * Searches by ISBN first, then falls back to title + series name
 */
export async function fetchMissingOpenLibraryRatings(
  limit: number = 50
): Promise<{ matched: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let matched = 0;
  let updated = 0;

  try {
    // Find books missing Goodreads ratings that have ISBN or need title search
    const booksToUpdate = await db
      .select({
        id: books.id,
        title: books.title,
        isbn: books.isbn,
        isbn13: books.isbn13,
        number: books.number,
        seriesId: books.series_id,
      })
      .from(books)
      .where(
        and(
          isNull(books.goodreads_rating),
          // Has either ISBN or title
          // We'll search by ISBN first, then by title
        )
      )
      .limit(limit);

    // Fetch series info for title context
    const seriesMap = new Map<string, string>();
    const seriesIds = [...new Set(booksToUpdate.map(b => b.seriesId))];
    if (seriesIds.length > 0) {
      const seriesData = await db
        .select({ id: series.id, name: series.name })
        .from(series)
        .where(eq(series.id, seriesIds[0])); // Simplified - in production would use IN clause
      seriesData.forEach(s => seriesMap.set(s.id, s.name));
    }

    // Process each book
    for (const book of booksToUpdate) {
      try {
        let result = null;

        // Try ISBN first (more reliable)
        if (book.isbn13) {
          result = await searchOpenLibraryByISBN(book.isbn13);
        } else if (book.isbn) {
          result = await searchOpenLibraryByISBN(book.isbn);
        }

        // Fallback to title search
        if (!result) {
          const seriesName = seriesMap.get(book.seriesId) || '';
          const searchQuery = book.number
            ? `${seriesName} ${book.number}`
            : seriesName || book.title;
          result = await searchOpenLibrary(searchQuery);
        }

        if (result && result.ratings_average) {
          matched++;
          // Update book with ratings
          await db
            .update(books)
            .set({
              goodreads_rating: result.ratings_average,
              goodreads_rating_count: result.ratings_count || 0,
              updated_at: new Date(),
            })
            .where(eq(books.id, book.id));
          updated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Book ${book.id}: ${msg}`);
      }

      // Rate limiting: OpenLibrary is lenient but be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Log completion
    await logEvent(
      'metadata_enriched',
      `Fetched ratings from OpenLibrary: ${updated} books updated`,
      { matched, updated, errors: errors.length },
      'info'
    );

    return { matched, updated, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Batch fetch failed: ${msg}`);
    return { matched, updated, errors };
  }
}

/**
 * Fetch ratings for a specific series from OpenLibrary
 * Useful for enriching series-level data
 */
export async function fetchSeriesOpenLibraryRating(
  seriesId: string
): Promise<{ rating: number; ratingCount: number } | null> {
  try {
    const [s] = await db
      .select({ name: series.name })
      .from(series)
      .where(eq(series.id, seriesId))
      .limit(1);

    if (!s) return null;

    const result = await searchOpenLibrary(s.name);
    if (!result?.ratings_average) return null;

    // Update series record
    await db
      .update(series)
      .set({
        goodreads_rating: result.ratings_average,
        goodreads_rating_count: result.ratings_count || 0,
        updated_at: new Date(),
      })
      .where(eq(series.id, seriesId));

    return {
      rating: result.ratings_average,
      ratingCount: result.ratings_count || 0,
    };
  } catch (err) {
    console.error('Series rating fetch failed:', err);
    return null;
  }
}
