'use server'

import { db } from '@/db';
import { series, requests } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

interface CreateFromCVPayload {
  cvId: string;
  title: string;
  year: number;
  publisher: string;
  description: string;
  image: string;
}

export async function createSeriesFromCV(data: CreateFromCVPayload) {
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

    // 2. Create a request for it
    await db.insert(requests).values({
      series_id: newSeriesId,
      title: data.title,
      publisher: data.publisher,
      cv_id: parseInt(data.cvId),
      edition: 'tpb',
      status: 'requested',
    });

    revalidatePath('/');
    revalidatePath('/discovery');
    return { success: true, seriesId: newSeriesId };
  } catch (error) {
    console.error('Create from CV Failed:', error);
    return { success: false, error: 'Database error' };
  }
}

