'use server';

import { db } from '@/db';
import { books, read_progress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { updateReadingProgress, markAsCompleted, resetReadingProgress } from '@/lib/data/reading-progress';
import { revalidatePath } from 'next/cache';
import { countPagesInArchive } from '@/lib/metadata/parser';
import { invalidateSmartCollections } from '@/lib/rules-engine';

/**
 * Get book info including total pages for the reader
 */
export async function getBookInfo(bookId: string) {
  try {
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
      columns: {
        id: true,
        title: true,
        page_count: true,
        file_path: true,
        series_id: true,
      },
    });

    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    let totalPages = book.page_count || 0;

    // If page_count is 0, count pages from the archive and update DB
    if (totalPages === 0 && book.file_path) {
      totalPages = await countPagesInArchive(book.file_path);

      // Update the database with the correct page count
      if (totalPages > 0) {
        await db.update(books)
          .set({ page_count: totalPages })
          .where(eq(books.id, bookId));
        console.log(`[READING] Updated page_count for ${bookId}: ${totalPages}`);
      }
    }

    // Get current reading progress for resume
    let currentPage = 1;
    try {
      const session = await auth();
      if (session?.user?.id) {
        const progress = await db.query.read_progress.findFirst({
          where: and(
            eq(read_progress.book_id, bookId),
            eq(read_progress.user_id, session.user.id)
          ),
          columns: { page: true, is_completed: true },
        });
        if (progress && !progress.is_completed && progress.page > 1) {
          currentPage = progress.page;
        }
      }
    } catch {
      // Non-critical — default to page 1
    }

    return {
      success: true,
      book: {
        id: book.id,
        title: book.title,
        totalPages,
        currentPage,
        seriesId: book.series_id,
      },
    };
  } catch (error) {
    console.error('Error fetching book info:', error);
    return { success: false, error: 'Failed to fetch book info' };
  }
}

/**
 * Save reading progress
 */
export async function saveReadingProgress(
  bookId: string,
  page: number,
  totalPages: number
) {
  try {
    await updateReadingProgress(bookId, page, totalPages);
    invalidateSmartCollections();
    return { success: true };
  } catch (error) {
    console.error('Error saving reading progress:', error);
    return { success: false, error: 'Failed to save progress' };
  }
}

/**
 * Toggle book read/unread status
 */
export async function toggleBookReadStatus(
  bookId: string,
  currentlyCompleted: boolean,
  totalPages: number
): Promise<{ success: boolean; isCompleted: boolean; error?: string }> {
  try {
    if (currentlyCompleted) {
      // Mark as unread - reset progress
      await resetReadingProgress(bookId);
      invalidateSmartCollections();
      revalidatePath('/library');
      return { success: true, isCompleted: false };
    } else {
      // Mark as read - set to completed
      await markAsCompleted(bookId, totalPages);
      invalidateSmartCollections();
      revalidatePath('/library');
      return { success: true, isCompleted: true };
    }
  } catch (error) {
    console.error('Error toggling read status:', error);
    return { success: false, isCompleted: currentlyCompleted, error: 'Failed to toggle read status' };
  }
}
