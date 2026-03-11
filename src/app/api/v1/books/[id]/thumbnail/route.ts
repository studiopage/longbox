import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { extractCoverThumbnail, getCoverCachePath, coverCacheExists } from '@/lib/utils/comic-cover-extractor';

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
    columns: { file_path: true },
  });

  if (!book) {
    return new NextResponse('Book not found', { status: 404 });
  }

  const cachePath = getCoverCachePath(id);

  if (await coverCacheExists(id)) {
    const buffer = await fs.readFile(cachePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await extractCoverThumbnail(book.file_path, cachePath);
    const buffer = await fs.readFile(cachePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Komga] Book thumbnail error:', error);
    return new NextResponse('Cover not available', { status: 500 });
  }
}
