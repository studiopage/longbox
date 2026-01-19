'use server';

import { db } from '@/db';
import { read_progress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function updateProgress(bookId: string, page: number, totalPages: number) {
  // If we are on the last page, mark as complete
  const isCompleted = page >= totalPages; 

  try {
    await db.insert(read_progress).values({
      book_id: bookId,
      page: page,
      is_completed: isCompleted,
      updated_at: new Date()
    }).onConflictDoUpdate({
      target: read_progress.book_id, // Uses the unique index
      set: {
        page: page,
        is_completed: isCompleted,
        updated_at: new Date()
      }
    });
  } catch (err) {
    console.error("Failed to save progress:", err);
  }
}

