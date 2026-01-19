'use server'

import { db } from '@/db';
import { series, request } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export async function importAndRequestSeries(formData: FormData) {
  const cvId = formData.get('cvId') as string;
  const title = formData.get('title') as string;
  const year = parseInt(formData.get('year') as string);
  const publisher = formData.get('publisher') as string;
  const description = formData.get('description') as string;
  const image = formData.get('image') as string;

  let seriesId = uuidv4();

  try {
    // 1. Check if we already have it
    const existing = await db.select({
      id: series.id,
    }).from(series).where(eq(series.cv_id, parseInt(cvId))).limit(1);
    
    if (existing.length > 0) {
      seriesId = existing[0].id;
    } else {
      // 2. Insert new Series
      await db.insert(series).values({
        id: seriesId,
        name: title,
        year: year,
        publisher,
        description,
        status: 'ongoing',
        cv_id: parseInt(cvId),
        thumbnail_url: image,
      });
    }

    // 3. Create the Request
    await db.insert(request).values({
      id: uuidv4(),
      series_id: seriesId,
      edition: 'tpb', // Default preference
      state: 'requested',
    });

  } catch (error) {
    console.error('Import Failed:', error);
    return { success: false, error: 'Database error' };
  }

  // 4. Redirect to the new official detail page
  revalidatePath('/');
  redirect(`/series/${seriesId}`);
}

