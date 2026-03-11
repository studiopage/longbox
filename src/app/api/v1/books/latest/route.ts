import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatBook, paginated } from '@/lib/komga';
import { db } from '@/db';
import { books, series, read_progress } from '@/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '0');
  const size = parseInt(url.searchParams.get('size') ?? '20');

  const [{ total }] = await db
    .select({ total: count() })
    .from(books);

  const rows = await db
    .select({
      book: books,
      seriesName: series.name,
    })
    .from(books)
    .innerJoin(series, eq(books.series_id, series.id))
    .orderBy(desc(books.created_at))
    .limit(size)
    .offset(page * size);

  if (rows.length === 0) {
    return NextResponse.json(paginated([], page, size, total));
  }

  // Batch-fetch read progress for all books in one query
  const bookIds = rows.map(r => r.book.id);
  const inClause = sql`${read_progress.book_id} IN (${sql.join(bookIds.map(id => sql`${id}`), sql`,`)})`;

  const progressRows = await db
    .select()
    .from(read_progress)
    .where(sql`${inClause} AND ${read_progress.user_id} = ${auth.userId}`);

  const progressMap = new Map(progressRows.map(p => [p.book_id, p]));

  const formatted = rows.map(r =>
    formatBook(r.book, r.seriesName, progressMap.get(r.book.id))
  );

  return NextResponse.json(paginated(formatted, page, size, total));
}
