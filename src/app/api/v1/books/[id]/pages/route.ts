import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { books } from '@/db/schema';
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
    columns: { page_count: true },
  });

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const pageCount = book.page_count ?? 0;
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    number: i + 1,
    fileName: `page${String(i + 1).padStart(3, '0')}.jpg`,
    mediaType: 'image/jpeg',
    width: 0,
    height: 0,
    fileHash: '',
    fileSize: 0,
  }));

  return NextResponse.json(pages);
}
