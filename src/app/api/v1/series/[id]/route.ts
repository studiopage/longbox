import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatSeries, type BookMetadataFallback } from '@/lib/komga';
import { db } from '@/db';
import { series, books, read_progress } from '@/db/schema';
import { eq, count, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const s = await db.query.series.findFirst({
    where: eq(series.id, id),
  });

  if (!s) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  }

  const [[{ total }], [readResult], [progressResult], firstBook] = await Promise.all([
    db.select({ total: count() }).from(books).where(eq(books.series_id, id)),

    db.select({ read: count() })
      .from(read_progress)
      .innerJoin(books, eq(read_progress.book_id, books.id))
      .where(and(eq(books.series_id, id), eq(read_progress.is_completed, true))),

    db.select({ inProgress: count() })
      .from(read_progress)
      .innerJoin(books, eq(read_progress.book_id, books.id))
      .where(and(eq(books.series_id, id), eq(read_progress.is_completed, false), sql`${read_progress.page} > 0`)),

    // First book with metadata as fallback for series-level fields
    db.query.books.findFirst({
      where: and(
        eq(books.series_id, id),
        sql`(${books.publisher} IS NOT NULL OR ${books.summary} IS NOT NULL OR ${books.authors} IS NOT NULL)`
      ),
      orderBy: books.number,
      columns: { publisher: true, summary: true, authors: true, published_date: true },
    }),
  ]);

  const bookFallback: BookMetadataFallback | undefined = firstBook ? {
    publisher: firstBook.publisher,
    summary: firstBook.summary,
    authors: firstBook.authors,
    published_date: firstBook.published_date,
  } : undefined;

  return NextResponse.json(formatSeries(s, {
    total,
    read: readResult?.read ?? 0,
    inProgress: progressResult?.inProgress ?? 0,
  }, bookFallback));
}
