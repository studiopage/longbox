import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractPage } from '@/lib/komga-page-extractor';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id, page } = await params;
  const pageIndex = parseInt(page) - 1; // Komga uses 1-indexed pages

  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
    columns: { file_path: true },
  });

  if (!book) {
    return new NextResponse('Book not found', { status: 404 });
  }

  try {
    const buffer = await extractPage(book.file_path, pageIndex);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Komga] Page extraction error:', error);
    return new NextResponse('Error reading page', { status: 500 });
  }
}
