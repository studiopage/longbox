import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatBook, paginated } from '@/lib/komga';
import { db } from '@/db';
import { books, series, read_progress } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '0');
  const size = parseInt(url.searchParams.get('size') ?? '20');

  // Find series where the user has started reading but not completed all books.
  // For each such series, get the last book they read (highest numberSort among
  // completed books), then pick the next book in the series.
  //
  // Strategy:
  // 1. Get all series with at least one completed read_progress for this user
  // 2. For each series, find the max completed book number
  // 3. Select the next book after that number
  const onDeckRows = await db.execute(sql`
    WITH user_progress AS (
      SELECT
        b.series_id,
        b.id AS book_id,
        b.number,
        rp.is_completed,
        rp.page,
        rp.updated_at AS progress_updated
      FROM read_progress rp
      INNER JOIN books b ON b.id = rp.book_id
      WHERE rp.user_id = ${auth.userId}
    ),
    series_with_progress AS (
      SELECT DISTINCT series_id
      FROM user_progress
      WHERE is_completed = true
    ),
    last_read_per_series AS (
      SELECT
        swp.series_id,
        MAX(up.progress_updated) AS last_read_at
      FROM series_with_progress swp
      INNER JOIN user_progress up ON up.series_id = swp.series_id AND up.is_completed = true
      GROUP BY swp.series_id
    ),
    next_book AS (
      SELECT DISTINCT ON (b.series_id)
        b.id,
        b.series_id,
        lr.last_read_at
      FROM books b
      INNER JOIN last_read_per_series lr ON lr.series_id = b.series_id
      LEFT JOIN read_progress rp ON rp.book_id = b.id AND rp.user_id = ${auth.userId}
      WHERE rp.id IS NULL OR (rp.is_completed = false OR rp.is_completed IS NULL)
      ORDER BY b.series_id, b.number ASC NULLS LAST
    )
    SELECT
      nb.id AS book_id,
      nb.last_read_at
    FROM next_book nb
    ORDER BY nb.last_read_at DESC
  `);

  const totalElements = (onDeckRows as any[]).length;
  const pagedRows = (onDeckRows as any[]).slice(page * size, (page + 1) * size);

  if (pagedRows.length === 0) {
    return NextResponse.json(paginated([], page, size, totalElements));
  }

  const bookIds = pagedRows.map((r: any) => r.book_id as string);

  // Fetch full book + series data
  const inClause = sql`${books.id} IN (${sql.join(bookIds.map(id => sql`${id}`), sql`,`)})`;

  const [bookRows, progressRows] = await Promise.all([
    db.select({ book: books, seriesName: series.name })
      .from(books)
      .innerJoin(series, eq(books.series_id, series.id))
      .where(inClause),
    db.select()
      .from(read_progress)
      .where(and(inClause, eq(read_progress.user_id, auth.userId))),
  ]);

  const bookMap = new Map(bookRows.map(r => [r.book.id, r]));
  const progressMap = new Map(progressRows.map(p => [p.book_id, p]));

  // Maintain the order from the on-deck query
  const formatted = bookIds
    .map(id => {
      const row = bookMap.get(id);
      if (!row) return null;
      return formatBook(row.book, row.seriesName, progressMap.get(id));
    })
    .filter(Boolean);

  return NextResponse.json(paginated(formatted, page, size, totalElements));
}
