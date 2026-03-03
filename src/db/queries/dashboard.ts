import { db } from '@/db';
import { series, requests, seriesMatchCandidates } from '@/db/schema';
import { count, eq, desc } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';

export async function getDashboardStats() {
  noStore();

  // Run all counts in parallel for speed
  const [
    totalSeries, 
    totalRequests, 
    mappedCount, 
    totalLocal,
    recentMatches
  ] = await Promise.all([
    db.select({ count: count() }).from(series),
    db.select({ count: count() }).from(requests),
    db.select({ count: count() }).from(seriesMatchCandidates).where(eq(seriesMatchCandidates.is_manually_verified, true)),
    db.select({ count: count() }).from(seriesMatchCandidates),
    
    // Fetch 6 most recently matched series for the "New Arrivals" shelf
    db.select({
        id: series.id,
        title: series.name,
        thumbnail_url: series.thumbnail_url,
        publisher: series.publisher,
        year: series.year
    })
    .from(series)
    .innerJoin(seriesMatchCandidates, eq(seriesMatchCandidates.series_id, series.id))
    .orderBy(desc(seriesMatchCandidates.updated_at))
    .limit(6)
  ]);

  const matchRate = totalLocal[0].count > 0 
    ? Math.round((mappedCount[0].count / totalLocal[0].count) * 100) 
    : 0;

  return {
    seriesCount: totalSeries[0].count,
    activeRequests: totalRequests[0].count, // Simply total for now
    localCount: totalLocal[0].count,
    matchRate,
    recentMatches
  };
}

