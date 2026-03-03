'use server'

import { db } from '@/db';
import { series } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

// Define the shape of the incoming data from the UI
interface MatchPayload {
  cvId: string;            // The ComicVine ID selected by user
  title: string;
  year: number;
  publisher: string;
  description: string;
  image: string;
}

export async function linkSeriesToMapping(data: MatchPayload) {
  try {
    // Create the Series
    const newSeriesId = uuidv4();

    await db.insert(series).values({
      id: newSeriesId,
      name: data.title,
      year: data.year,
      publisher: data.publisher,
      description: data.description,
      status: 'ongoing',
      cv_id: parseInt(data.cvId),
      thumbnail_url: data.image,
    });

    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Match Failed:', error);
    return { success: false, error: 'Database error' };
  }
}

