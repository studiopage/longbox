/**
 * POST /api/v1/backfill
 *
 * One-time backfill: propagate book-level metadata (publisher, description, year)
 * up to series that are missing those fields. Uses the first book (by issue number)
 * in each series as the source of truth.
 *
 * Protected by Basic Auth (admin use only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { eq, sql, isNull, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Find all series missing publisher, description, or year
  const emptySeries = await db
    .select({ id: series.id, publisher: series.publisher, description: series.description, year: series.year })
    .from(series)
    .where(or(isNull(series.publisher), isNull(series.description), isNull(series.year)));

  let updated = 0;

  for (const s of emptySeries) {
    // Get the first book with metadata
    const firstBook = await db
      .select({
        publisher: books.publisher,
        summary: books.summary,
        authors: books.authors,
        published_date: books.published_date,
      })
      .from(books)
      .where(eq(books.series_id, s.id))
      .orderBy(books.number)
      .limit(1);

    if (firstBook.length === 0) continue;
    const b = firstBook[0];

    const updates: Record<string, unknown> = {};
    if (!s.publisher && b.publisher) updates.publisher = b.publisher;
    if (!s.description && b.summary) updates.description = b.summary;
    if (!s.year && b.published_date) updates.year = b.published_date.getFullYear();

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await db.update(series).set(updates).where(eq(series.id, s.id));
      updated++;
    }
  }

  // now backfill books that still lack a publisher but belong to a series that has one
  const result = await db.execute(sql`
    UPDATE books
    SET publisher = s.publisher
    FROM series s
    WHERE books.series_id = s.id
      AND books.publisher IS NULL
      AND s.publisher IS NOT NULL
  `);
  const booksUpdated = result.rowCount || 0;

  return NextResponse.json({
    message: `Backfilled ${updated} series; updated ${booksUpdated} books with missing publisher`,
    updatedSeries: updated,
    totalSeries: emptySeries.length,
    updatedBooks: booksUpdated,
  });
}
