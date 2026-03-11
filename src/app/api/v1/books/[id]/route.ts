import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatBook } from '@/lib/komga';
import { db } from '@/db';
import { books, series, read_progress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
  });

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const s = await db.query.series.findFirst({
    where: eq(series.id, book.series_id),
    columns: { name: true },
  });

  const progress = await db.query.read_progress.findFirst({
    where: eq(read_progress.book_id, id),
  });

  return NextResponse.json(formatBook(book, s?.name ?? 'Unknown', progress));
}
