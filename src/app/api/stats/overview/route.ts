import { db } from '@/db';
import { series, books, importQueue, read_progress } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Parallel fetch all stats
    const [
      seriesCount,
      booksCount,
      queueCount,
      unmatchedCount,
      inProgressCount,
      completedCount,
    ] = await Promise.all([
      // Total series count
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(series),

      // Total books count
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(books),

      // Review queue count
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(importQueue),

      // Unmatched series count (series with books but no cv_id)
      db.select({ count: sql<number>`count(distinct ${series.id})`.mapWith(Number) })
        .from(series)
        .innerJoin(books, sql`${series.id} = ${books.series_id}`)
        .where(sql`${series.cv_id} IS NULL`),

      // In-progress reading count
      db.select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(read_progress)
        .where(eq(read_progress.is_completed, false)),

      // Completed reading count
      db.select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(read_progress)
        .where(eq(read_progress.is_completed, true)),
    ]);

    return NextResponse.json({
      totalSeries: seriesCount[0]?.count || 0,
      totalBooks: booksCount[0]?.count || 0,
      reviewQueue: queueCount[0]?.count || 0,
      unmatchedSeries: unmatchedCount[0]?.count || 0,
      inProgress: inProgressCount[0]?.count || 0,
      completed: completedCount[0]?.count || 0,
      libraryRoot: process.env.LIBRARY_ROOT || '/comics',
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
