import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { series, books } from '@/db/schema';
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

  // Get first book in series for cover
  const firstBook = await db.query.books.findFirst({
    where: eq(books.series_id, id),
    orderBy: books.number,
    columns: { id: true, file_path: true },
  });

  if (!firstBook) {
    return new NextResponse('No books in series', { status: 404 });
  }

  // Use existing cover cache
  const cachePath = getCoverCachePath(firstBook.id);

  if (await coverCacheExists(firstBook.id)) {
    const buffer = await fs.readFile(cachePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Generate cover
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await extractCoverThumbnail(firstBook.file_path, cachePath);
    const buffer = await fs.readFile(cachePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Komga] Series thumbnail error:', error);
    return new NextResponse('Cover not available', { status: 500 });
  }
}
