/**
 * Reading Progress Data Access Layer
 *
 * Functions for fetching and managing reading progress
 */

import { db } from '@/db';
import { read_progress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface ReadingProgress {
  page: number;
  totalPages: number;
  percentage: number;
  isCompleted: boolean;
}

/**
 * Get reading progress for a specific book
 *
 * @param bookId - The book ID to fetch progress for
 * @param totalPages - Total pages in the book (from book metadata)
 * @returns Reading progress object or null if no progress exists
 */
export async function getReadingProgress(
  bookId: string,
  totalPages: number
): Promise<ReadingProgress | null> {
  try {
    const progress = await db.query.read_progress.findFirst({
      where: eq(read_progress.book_id, bookId),
    });

    if (!progress) {
      return null;
    }

    const percentage = totalPages > 0
      ? Math.round((progress.page / totalPages) * 100)
      : 0;

    return {
      page: progress.page,
      totalPages,
      percentage,
      isCompleted: progress.is_completed ?? false,
    };
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return null;
  }
}

/**
 * Update or create reading progress for a book
 *
 * @param bookId - The book ID
 * @param page - Current page number
 * @param totalPages - Total pages in the book
 * @returns The updated progress
 */
export async function updateReadingProgress(
  bookId: string,
  page: number,
  totalPages: number
): Promise<ReadingProgress> {
  const isCompleted = page >= totalPages;
  const percentage = totalPages > 0
    ? Math.round((page / totalPages) * 100)
    : 0;

  try {
    // Check if progress exists
    const existing = await db.query.read_progress.findFirst({
      where: eq(read_progress.book_id, bookId),
    });

    if (existing) {
      // Update existing progress
      await db
        .update(read_progress)
        .set({
          page,
          is_completed: isCompleted,
          updated_at: new Date()
        })
        .where(eq(read_progress.book_id, bookId));
    } else {
      // Create new progress
      await db
        .insert(read_progress)
        .values({
          book_id: bookId,
          page,
          is_completed: isCompleted,
        });
    }

    return {
      page,
      totalPages,
      percentage,
      isCompleted,
    };
  } catch (error) {
    console.error('Error updating reading progress:', error);
    throw error;
  }
}

/**
 * Mark a book as completed
 *
 * @param bookId - The book ID
 * @param totalPages - Total pages in the book
 */
export async function markAsCompleted(
  bookId: string,
  totalPages: number
): Promise<void> {
  await updateReadingProgress(bookId, totalPages, totalPages);
}

/**
 * Reset reading progress for a book
 *
 * @param bookId - The book ID
 */
export async function resetReadingProgress(bookId: string): Promise<void> {
  try {
    await db
      .delete(read_progress)
      .where(eq(read_progress.book_id, bookId));
  } catch (error) {
    console.error('Error resetting reading progress:', error);
    throw error;
  }
}
