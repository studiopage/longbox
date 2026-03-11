import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatSeries, paginated } from '@/lib/komga';
import { db } from '@/db';
import { series, books, read_progress } from '@/db/schema';
import { eq, ilike, count, sql, and, isNotNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '0');
  const size = parseInt(url.searchParams.get('size') ?? '20');
  const search = url.searchParams.get('search') ?? '';

  // Count total
  const where = search
    ? ilike(series.name, `%${search}%`)
    : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(series)
    .where(where);

  // Fetch page of series
  const rows = await db
    .select()
    .from(series)
    .where(where)
    .orderBy(series.name)
    .limit(size)
    .offset(page * size);

  // Get book counts per series in one query
  const seriesIds = rows.map(r => r.id);
  const bookCounts = seriesIds.length > 0
    ? await db
        .select({
          series_id: books.series_id,
          total: count(),
        })
        .from(books)
        .where(sql`${books.series_id} IN (${sql.join(seriesIds.map(id => sql`${id}`), sql`,`)})`)
        .groupBy(books.series_id)
    : [];

  // Get read counts
  const readCounts = seriesIds.length > 0
    ? await db
        .select({
          series_id: books.series_id,
          read: count(),
        })
        .from(read_progress)
        .innerJoin(books, eq(read_progress.book_id, books.id))
        .where(and(
          sql`${books.series_id} IN (${sql.join(seriesIds.map(id => sql`${id}`), sql`,`)})`,
          eq(read_progress.is_completed, true)
        ))
        .groupBy(books.series_id)
    : [];

  // Get in-progress counts
  const progressCounts = seriesIds.length > 0
    ? await db
        .select({
          series_id: books.series_id,
          inProgress: count(),
        })
        .from(read_progress)
        .innerJoin(books, eq(read_progress.book_id, books.id))
        .where(and(
          sql`${books.series_id} IN (${sql.join(seriesIds.map(id => sql`${id}`), sql`,`)})`,
          eq(read_progress.is_completed, false),
          sql`${read_progress.page} > 0`
        ))
        .groupBy(books.series_id)
    : [];

  const countMap = new Map(bookCounts.map(r => [r.series_id, r.total]));
  const readMap = new Map(readCounts.map(r => [r.series_id, r.read]));
  const progressMap = new Map(progressCounts.map(r => [r.series_id, r.inProgress]));

  const formatted = rows.map(s => formatSeries(s, {
    total: countMap.get(s.id) ?? 0,
    read: readMap.get(s.id) ?? 0,
    inProgress: progressMap.get(s.id) ?? 0,
  }));

  return NextResponse.json(paginated(formatted, page, size, total));
}
