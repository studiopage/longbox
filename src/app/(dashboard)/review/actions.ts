'use server';

import { db } from '@/db';
import { books, series, importQueue } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function rejectImport(id: string) {
  await db.delete(importQueue).where(eq(importQueue.id, id));
  revalidatePath('/review');
}

export async function approveImport(id: string, seriesName: string, rawMetadata: string | null) {
  // 1. Get the queued item
  const item = await db.query.importQueue.findFirst({
    where: eq(importQueue.id, id)
  });

  if (!item) return { error: "Item not found" };

  // 2. Parse metadata (safely)
  const metadata = rawMetadata ? JSON.parse(rawMetadata) : {};

  // 3. Find or Create Series
  let seriesId: string;
  const existingSeries = await db.query.series.findFirst({
    where: eq(series.name, seriesName)
  });

  if (existingSeries) {
    seriesId = existingSeries.id;
  } else {
    const [newSeries] = await db.insert(series).values({
      name: seriesName,
      publisher: metadata.publisher,
      year: metadata.year,
    }).returning();
    seriesId = newSeries.id;
  }

  // 4. Create Book
  await db.insert(books).values({
    series_id: seriesId,
    file_path: item.file_path,
    file_size: item.file_size,
    title: item.suggested_title || "Unknown Issue",
    number: item.suggested_number || "1",
    page_count: metadata.pageCount || 0,
    summary: metadata.summary,
    publisher: metadata.publisher,
    authors: [metadata.writer, metadata.penciller].filter(Boolean).join(", "),
    published_date: metadata.year 
        ? new Date(metadata.year, (metadata.month || 1) - 1, 1) 
        : null
  });

  // 5. Remove from Queue
  await db.delete(importQueue).where(eq(importQueue.id, id));

  revalidatePath('/review');
  revalidatePath('/library');
  revalidatePath('/');
}
