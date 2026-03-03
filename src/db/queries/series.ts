import { db } from '@/db';
import { series, request, seriesMatchCandidates } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';

export async function getRecentSeries() {
  noStore(); 
  return await db.select({
    id: series.id,
    name: series.name,
    publisher: series.publisher,
    year: series.year,
    description: series.description,
    status: series.status,
    thumbnail_url: series.thumbnail_url,
    cv_id: series.cv_id,
    created_at: series.created_at,
    updated_at: series.updated_at,
  }).from(series).orderBy(desc(series.year));
}

// NEW: Fetch details + Request Status
export async function getSeriesDetails(id: string) {
  noStore();
  
  const result = await db.select({
    series: series,
    request: request,
    local: seriesMatchCandidates, // NEW: Fetch the local mapping
  })
  .from(series)
  .leftJoin(request, eq(request.series_id, series.id))
  .leftJoin(seriesMatchCandidates, eq(seriesMatchCandidates.series_id, series.id)) // NEW: Join
  .where(eq(series.id, id))
  .limit(1);

  return result[0] || null;
}

