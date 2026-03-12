'use server';

import { db } from '@/db';
import { systemSettings, series, books } from '@/db/schema';
import { isNull, eq, sql } from 'drizzle-orm';
import { searchComicVine } from '@/lib/comicvine';

/**
 * Check whether a ComicVine API key is configured.
 * Used by the discovery page to show helpful guidance when unconfigured.
 */
export async function checkComicVineConfigured(): Promise<boolean> {
  try {
    const [row] = await db.select({ cv_api_key: systemSettings.cv_api_key }).from(systemSettings).limit(1);
    return !!row?.cv_api_key;
  } catch {
    return false;
  }
}

/**
 * Fetch missing ComicVine data for unmatched series.
 * Searches ComicVine for each series without a cv_id and updates if found.
 * Returns counts of matched/updated series.
 */
export async function fetchMissingComicVineData(): Promise<{
  matched: number;
  updated: number;
  errors: number;
}> {
  try {
    // Check if CV is configured
    const configured = await checkComicVineConfigured();
    if (!configured) {
      throw new Error('ComicVine API key not configured');
    }

    // Get all series without cv_id that have books
    const unmatchedSeries = await db
      .select({ id: series.id, name: series.name })
      .from(series)
      .innerJoin(books, eq(series.id, books.series_id))
      .where(isNull(series.cv_id))
      .groupBy(series.id);

    let matched = 0;
    let updated = 0;
    let errors = 0;

    // Search ComicVine for each series
    // Rate limiting is handled internally by searchComicVine() (1 req/sec)
    for (const s of unmatchedSeries) {
      try {
        const results = await searchComicVine(s.name);
        if (results && results.length > 0) {
          // Pick the first result (best match by ComicVine relevance)
          const bestMatch = results[0];
          
          // Update the series with cv_id
          await db
            .update(series)
            .set({
              cv_id: bestMatch.id,
              updated_at: new Date(),
            })
            .where(eq(series.id, s.id));

          matched++;
          updated++;
        }
      } catch (err) {
        console.error(`[Discovery] Failed to fetch CV data for ${s.name}:`, err);
        errors++;
      }
    }

    return { matched, updated, errors };
  } catch (error) {
    console.error('[Discovery] fetchMissingComicVineData error:', error);
    throw error;
  }
}
