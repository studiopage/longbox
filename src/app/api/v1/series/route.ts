import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatSeries, paginated, type BookMetadataFallback } from '@/lib/komga';
import { db } from '@/db';
import { series, books, read_progress } from '@/db/schema';
import { eq, ilike, count, sql, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '0');
  const size = parseInt(url.searchParams.get('size') ?? '20');
  const search = url.searchParams.get('search') ?? '';

  const where = search ? ilike(series.name, `%${search}%`) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(series)
    .where(where);

  const rows = await db
    .select()
    .from(series)
    .where(where)
    .orderBy(series.name)
    .limit(size)
    .offset(page * size);

  const seriesIds = rows.map(r => r.id);
  if (seriesIds.length === 0) {
    return NextResponse.json(paginated([], page, size, total));
  }

  const inClause = sql`${books.series_id} IN (${sql.join(seriesIds.map(id => sql`${id}`), sql`,`)})`;

  // Batch queries in parallel
  const [bookCounts, readCounts, progressCounts, bookMetadata] = await Promise.all([
    db.select({ series_id: books.series_id, total: count() })
      .from(books).where(inClause).groupBy(books.series_id),

    db.select({ series_id: books.series_id, read: count() })
      .from(read_progress)
      .innerJoin(books, eq(read_progress.book_id, books.id))
      .where(and(inClause, eq(read_progress.is_completed, true)))
      .groupBy(books.series_id),

    db.select({ series_id: books.series_id, inProgress: count() })
      .from(read_progress)
      .innerJoin(books, eq(read_progress.book_id, books.id))
      .where(and(inClause, eq(read_progress.is_completed, false), sql`${read_progress.page} > 0`))
      .groupBy(books.series_id),

    // Get first book's metadata per series as fallback
    db.execute(sql`
      SELECT DISTINCT ON (series_id) series_id, publisher, summary, authors, published_date
      FROM books
      WHERE ${inClause} AND (publisher IS NOT NULL OR summary IS NOT NULL OR authors IS NOT NULL)
      ORDER BY series_id, number ASC NULLS LAST, created_at ASC
    `),
  ]);

  const countMap = new Map(bookCounts.map(r => [r.series_id, r.total]));
  const readMap = new Map(readCounts.map(r => [r.series_id, r.read]));
  const progressMap = new Map(progressCounts.map(r => [r.series_id, r.inProgress]));
  const metaMap = new Map<string, BookMetadataFallback>();
  for (const row of bookMetadata as any[]) {
    metaMap.set(row.series_id, {
      publisher: row.publisher,
      summary: row.summary,
      authors: row.authors,
      published_date: row.published_date ? new Date(row.published_date) : null,
    });
  }

  const formatted = rows.map(s => formatSeries(s, {
    total: countMap.get(s.id) ?? 0,
    read: readMap.get(s.id) ?? 0,
    inProgress: progressMap.get(s.id) ?? 0,
  }, metaMap.get(s.id)));

  return NextResponse.json(paginated(formatted, page, size, total));
}
