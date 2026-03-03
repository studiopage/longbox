import { db } from '@/db';
import { series, requests } from '@/db/schema';
import { count, desc } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';

export async function getDashboardStats() {
  noStore();

  // Run all counts in parallel for speed
  const [
    totalSeries,
    totalRequests,
    recentSeries
  ] = await Promise.all([
    db.select({ count: count() }).from(series),
    db.select({ count: count() }).from(requests),

    // Fetch 6 most recently added series
    db.select({
        id: series.id,
        title: series.name,
        thumbnail_url: series.thumbnail_url,
        publisher: series.publisher,
        year: series.year
    })
    .from(series)
    .orderBy(desc(series.created_at))
    .limit(6)
  ]);

  return {
    seriesCount: totalSeries[0].count,
    activeRequests: totalRequests[0].count,
    recentSeries
  };
}

