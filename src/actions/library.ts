'use server'

import { db } from '@/db';
import { series, issues } from '@/db/schema';
import { getComicVineVolume, getComicVineIssues } from '@/lib/comicvine';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { syncSeriesWithKomgaAction } from './komga-sync';
import { forceSyncIssuesAction } from './requests';

export async function importSeriesAction(cvId: string, komgaId?: string) {
  // Check if series already exists
  const existing = await db.select().from(series).where(eq(series.comicvine_id, cvId)).limit(1);
  if (existing.length > 0) {
    return { success: true, localId: existing[0].id };
  }

  // 1. Fetch Fresh Data from ComicVine
  const volume = await getComicVineVolume(cvId);
  if (!volume) {
    return { success: false, message: "ComicVine ID not found" };
  }

  // 2. Insert Series with Komga ID
  const [newSeries] = await db.insert(series).values({
    comicvine_id: cvId,
    title: volume.name,
    start_year: volume.start_year ? parseInt(volume.start_year) : 0,
    publisher: volume.publisher?.name || 'Unknown',
    description: volume.description || null,
    thumbnail_url: volume.image?.medium_url || null,
    issue_count: volume.count_of_issues || 0,
    status: 'ongoing', // Default status
    komga_id: komgaId || null, // Save the link
  }).returning();

  const seriesId = newSeries.id;

  // 3. Fetch and Sync Issues
  await forceSyncIssuesAction(seriesId, cvId);

  // 4. AUTO-SYNC FILES (New Magic) 🪄
  if (komgaId) {
    console.log(`🔗 Auto-linking to Komga ID: ${komgaId}`);
    // We trigger the file match immediately
    await syncSeriesWithKomgaAction(seriesId);
  }

  revalidatePath('/library');
  revalidatePath('/import');
  revalidatePath('/');
  revalidatePath('/discovery');
  
  return { success: true, localId: seriesId };
}

