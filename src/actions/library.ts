'use server'

import { db } from '@/db';
import { series, issues, books } from '@/db/schema';
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
  revalidatePath('/settings');

  return { success: true, localId: seriesId };
}

/**
 * Match an existing unmatched series to a ComicVine volume.
 * Updates the existing series with CV metadata instead of creating a new one.
 * If the CV ID is already linked to another series, merges the books into that series.
 */
export async function matchExistingSeriesAction(existingSeriesId: string, cvId: string) {
  // Check if this CV ID is already linked to another series
  const cvAlreadyLinked = await db.select({
    id: series.id,
  }).from(series).where(eq(series.cv_id, parseInt(cvId))).limit(1);

  if (cvAlreadyLinked.length > 0 && cvAlreadyLinked[0].id !== existingSeriesId) {
    // CV ID is linked to a different series - merge books into that series
    const targetSeriesId = cvAlreadyLinked[0].id;

    // Move all books from the unmatched series to the matched series
    await db.update(books)
      .set({ series_id: targetSeriesId })
      .where(eq(books.series_id, existingSeriesId));

    // Delete the now-empty unmatched series
    await db.delete(series)
      .where(eq(series.id, existingSeriesId));

    revalidatePath('/library');
    revalidatePath('/import');
    revalidatePath('/');
    revalidatePath('/discovery');
    revalidatePath('/settings');

    return { success: true, localId: targetSeriesId, merged: true };
  }

  // Fetch metadata from ComicVine
  const volume = await getComicVineVolume(cvId);
  if (!volume) {
    return { success: false, message: "ComicVine ID not found" };
  }

  // Update the existing series with ComicVine metadata
  await db.update(series)
    .set({
      cv_id: parseInt(cvId),
      name: volume.name,
      year: volume.start_year ? parseInt(volume.start_year) : undefined,
      publisher: volume.publisher?.name || undefined,
      description: volume.description || undefined,
      thumbnail_url: volume.image?.medium_url || undefined,
      updated_at: new Date(),
    })
    .where(eq(series.id, existingSeriesId));

  // Sync issues for this series
  await forceSyncIssuesAction(existingSeriesId, cvId);

  revalidatePath('/library');
  revalidatePath('/import');
  revalidatePath('/');
  revalidatePath('/discovery');
  revalidatePath('/settings');

  return { success: true, localId: existingSeriesId };
}

