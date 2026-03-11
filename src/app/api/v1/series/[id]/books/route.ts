import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatBook, paginated } from '@/lib/komga';
import { db } from '@/db';
import { series, books, read_progress } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '0');
  const size = parseInt(url.searchParams.get('size') ?? '20');

  const s = await db.query.series.findFirst({
    where: eq(series.id, id),
    columns: { name: true },
  });

  if (!s) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(books)
    .where(eq(books.series_id, id));

  const rows = await db
    .select()
    .from(books)
    .where(eq(books.series_id, id))
    .orderBy(books.number)
    .limit(size)
    .offset(page * size);

  // Batch fetch read progress for all books
  const bookIds = rows.map(r => r.id);
  const progressRows = bookIds.length > 0
    ? await db.query.read_progress.findMany({
        where: (rp, { inArray }) => inArray(rp.book_id, bookIds),
      })
    : [];
  const progressMap = new Map(progressRows.map(rp => [rp.book_id, rp]));

  const formatted = rows.map(b =>
    formatBook(b, s.name, progressMap.get(b.id))
  );

  return NextResponse.json(paginated(formatted, page, size, total));
}
