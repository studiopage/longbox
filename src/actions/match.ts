'use server'

import { db } from '@/db';
import { series, seriesMatchCandidates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

// Define the shape of the incoming data from the UI
interface MatchPayload {
  mappingId: string;       // The ID of the "Unmatched" row
  cvId: string;            // The ComicVine ID selected by user
  title: string;
  year: number;
  publisher: string;
  description: string;
  image: string;
}

export async function linkSeriesToMapping(data: MatchPayload) {
  try {
    // 1. Create the Series (The Truth)
    const newSeriesId = uuidv4();
    
    await db.insert(series).values({
      id: newSeriesId,
      name: data.title,
      year: data.year,
      publisher: data.publisher,
      description: data.description,
      status: 'ongoing', // Default
      cv_id: parseInt(data.cvId),
      thumbnail_url: data.image,
    });

    // 2. Link the Ghost (The Mapping)
    await db.update(seriesMatchCandidates)
      .set({ 
        series_id: newSeriesId,
        match_confidence: 1.0,
        is_manually_verified: true,
        updated_at: new Date()
      })
      .where(eq(seriesMatchCandidates.id, data.mappingId));

    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Match Failed:', error);
    return { success: false, error: 'Database error' };
  }
}

