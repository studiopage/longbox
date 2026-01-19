import { NextResponse } from 'next/server';
import { db } from '@/db';
import { books, fileSeries } from '@/db/schema';
import { count } from 'drizzle-orm';

export async function GET() {
  try {
    const [seriesCount, booksCount] = await Promise.all([
      db.select({ count: count() }).from(fileSeries),
      db.select({ count: count() }).from(books),
    ]);

    return NextResponse.json({
      scanner: 'active',
      series: seriesCount[0]?.count || 0,
      books: booksCount[0]?.count || 0,
      libraryRoot: process.env.LIBRARY_ROOT || '/comics',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Scanner status check failed', details: String(error) },
      { status: 500 }
    );
  }
}

