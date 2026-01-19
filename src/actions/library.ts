'use server'

import { db } from '@/db';
import { series, issues } from '@/db/schema';
import { getComicVineVolume, getComicVineIssues } from '@/lib/comicvine';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { forceSyncIssuesAction } from './requests';

export async function importSeriesAction(cvId: string) {
  // Check if series already exists
  const existing = await db.select({
    id: series.id,
  }).from(series).where(eq(series.cv_id, parseInt(cvId))).limit(1);
  if (existing.length > 0) {
    return { success: true, localId: existing[0].id };
  }

  // 1. Fetch Fresh Data from ComicVine
  const volume = await getComicVineVolume(cvId);
  if (!volume) {
    return { success: false, message: "ComicVine ID not found" };
  }

  // 2. Insert Series
  const [newSeries] = await db.insert(series).values({
    cv_id: parseInt(cvId),
    name: volume.name,
    year: volume.start_year ? parseInt(volume.start_year) : new Date().getFullYear(),
    publisher: volume.publisher?.name || 'Unknown',
    description: volume.description || null,
    thumbnail_url: volume.image?.medium_url || null,
    status: 'ongoing', // Default status
  }).returning();

  const seriesId = newSeries.id;

  // 3. Fetch and Sync Issues
  await forceSyncIssuesAction(seriesId, cvId);

  revalidatePath('/library');
  revalidatePath('/import');
  revalidatePath('/');
  revalidatePath('/discovery');
  
  return { success: true, localId: seriesId };
}

