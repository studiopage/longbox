import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  extractCoverThumbnail,
  getCoverCachePath,
  coverCacheExists,
} from '@/lib/utils/comic-cover-extractor';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    // Check if cover is already cached
    const cacheExists = await coverCacheExists(bookId);
    const cachePath = getCoverCachePath(bookId);

    if (cacheExists) {
      // Serve from cache
      const imageBuffer = await fs.readFile(cachePath);
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Cache miss - generate thumbnail
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Extract cover from comic file
    try {
      await extractCoverThumbnail(book.file_path, cachePath);

      // Serve the newly generated thumbnail
      const imageBuffer = await fs.readFile(cachePath);
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (extractError) {
      console.error('Failed to extract cover:', extractError);

      // Return placeholder or error
      return NextResponse.json(
        { error: 'Failed to extract cover image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cover API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
