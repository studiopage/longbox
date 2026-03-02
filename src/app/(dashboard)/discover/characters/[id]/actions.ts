'use server';

import { db } from '@/db';
import { books, series } from '@/db/schema';
import { ilike, or, desc, asc, eq } from 'drizzle-orm';

export interface CharacterAppearance {
  bookId: string;
  seriesId: string;
  seriesName: string;
  title: string;
  issueNumber: string | null;
  coverUrl: string | null;
  publishedDate: string | null;
}

type SortOrder = 'newest' | 'oldest' | 'series';

/**
 * Search for character appearances in the local library
 *
 * This searches through:
 * - Book titles
 * - Series names
 * - Book summaries (if available)
 * - Author names (for writer-focused searches)
 */
export async function getCharacterAppearances(
  characterName: string,
  sortOrder: SortOrder = 'newest'
): Promise<CharacterAppearance[]> {
  try {
    // Split character name into parts for better matching
    // e.g., "Spider-Man" -> search for "Spider-Man", "Spider", "Man", "Peter Parker"
    const searchTerms = generateSearchTerms(characterName);

    // Build OR conditions for each search term
    const conditions = searchTerms.flatMap(term => [
      ilike(books.title, `%${term}%`),
      ilike(series.name, `%${term}%`),
      ilike(books.summary, `%${term}%`),
    ]);

    // Determine sort order
    let orderBy;
    switch (sortOrder) {
      case 'newest':
        orderBy = desc(books.published_date);
        break;
      case 'oldest':
        orderBy = asc(books.published_date);
        break;
      case 'series':
        orderBy = asc(series.name);
        break;
      default:
        orderBy = desc(books.published_date);
    }

    const results = await db
      .select({
        bookId: books.id,
        seriesId: series.id,
        seriesName: series.name,
        title: books.title,
        issueNumber: books.number,
        thumbnail: series.thumbnail_url,
        publishedDate: books.published_date,
      })
      .from(books)
      .innerJoin(series, eq(books.series_id, series.id))
      .where(or(...conditions))
      .orderBy(orderBy)
      .limit(50);

    return results.map(r => ({
      bookId: r.bookId,
      seriesId: r.seriesId,
      seriesName: r.seriesName,
      title: r.title,
      issueNumber: r.issueNumber,
      coverUrl: r.thumbnail || `/api/cover/${r.bookId}`,
      publishedDate: r.publishedDate ? formatDate(r.publishedDate) : null,
    }));
  } catch (error) {
    console.error('[CHARACTER] Failed to fetch appearances:', error);
    return [];
  }
}

/**
 * Generate search terms from character name
 */
function generateSearchTerms(name: string): string[] {
  const terms = new Set<string>();

  // Add the full name
  terms.add(name);

  // Add without hyphens (Spider-Man -> Spider Man)
  if (name.includes('-')) {
    terms.add(name.replace(/-/g, ' '));
    // Also add individual parts
    name.split('-').forEach(part => {
      if (part.length > 2) terms.add(part);
    });
  }

  // Handle common patterns
  // "The Batman" -> "Batman"
  if (name.toLowerCase().startsWith('the ')) {
    terms.add(name.substring(4));
  }

  // Handle suffixes like "Man", "Woman", "Girl", "Boy"
  const heroSuffixes = ['man', 'woman', 'girl', 'boy'];
  for (const suffix of heroSuffixes) {
    if (name.toLowerCase().endsWith(suffix) && name.length > suffix.length + 2) {
      // e.g., "Batman" -> "Bat"
      const prefix = name.slice(0, -suffix.length);
      if (prefix.length > 2) terms.add(prefix);
    }
  }

  return Array.from(terms);
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(date);
}
