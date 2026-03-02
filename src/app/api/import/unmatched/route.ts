import { db } from '@/db';
import { series, books } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch series that have books but no ComicVine ID (unmatched)
    const fileBasedSeries = await db
      .select({
        id: series.id,
        name: series.name,
        bookCount: sql<number>`count(${books.id})`.mapWith(Number),
        publisher: series.publisher,
        status: series.status,
      })
      .from(series)
      .innerJoin(books, sql`${series.id} = ${books.series_id}`)
      .where(sql`${series.cv_id} IS NULL`)
      .groupBy(series.id, series.name, series.publisher, series.status);

    const unmatchedSeries = fileBasedSeries.map(fs => ({
      id: fs.id,
      name: fs.name,
      metadata: {
        title: fs.name,
        publisher: fs.publisher || '',
        status: fs.status || '',
      },
      booksCount: fs.bookCount || 0,
    }));

    return NextResponse.json(unmatchedSeries);
  } catch (error) {
    console.error('Failed to fetch unmatched series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unmatched series' },
      { status: 500 }
    );
  }
}
