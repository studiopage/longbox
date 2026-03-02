'use server';

import { db } from '@/db';
import { readingList, books, series } from '@/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface ReadingListItem {
  id: string;
  bookId: string;
  bookTitle: string;
  bookNumber: string | null;
  seriesId: string;
  seriesName: string;
  coverUrl: string;
  sortOrder: number;
  addedAt: Date | null;
}

/**
 * Get all items in the reading list
 */
export async function getReadingList(): Promise<ReadingListItem[]> {
  try {
    const results = await db
      .select({
        id: readingList.id,
        bookId: readingList.book_id,
        sortOrder: readingList.sort_order,
        addedAt: readingList.added_at,
        bookTitle: books.title,
        bookNumber: books.number,
        seriesId: books.series_id,
        seriesName: series.name,
      })
      .from(readingList)
      .innerJoin(books, eq(readingList.book_id, books.id))
      .innerJoin(series, eq(books.series_id, series.id))
      .orderBy(asc(readingList.sort_order));

    return results.map((item) => ({
      id: item.id,
      bookId: item.bookId,
      bookTitle: item.bookTitle,
      bookNumber: item.bookNumber,
      seriesId: item.seriesId,
      seriesName: item.seriesName,
      coverUrl: `/api/cover/${item.bookId}`,
      sortOrder: item.sortOrder ?? 0,
      addedAt: item.addedAt,
    }));
  } catch (error) {
    console.error('[READING_LIST] Failed to get reading list:', error);
    return [];
  }
}

/**
 * Add a book to the reading list
 */
export async function addToReadingList(
  bookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current max sort order
    const existingItems = await db
      .select({ sortOrder: readingList.sort_order })
      .from(readingList)
      .orderBy(desc(readingList.sort_order))
      .limit(1);

    const nextSortOrder = existingItems.length > 0 ? (existingItems[0].sortOrder ?? 0) + 1 : 0;

    await db.insert(readingList).values({
      book_id: bookId,
      sort_order: nextSortOrder,
    }).onConflictDoNothing();

    revalidatePath('/reading-list');
    revalidatePath('/library');

    return { success: true };
  } catch (error) {
    console.error('[READING_LIST] Failed to add to reading list:', error);
    return { success: false, error: 'Failed to add to reading list' };
  }
}

/**
 * Remove a book from the reading list
 */
export async function removeFromReadingList(
  bookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(readingList).where(eq(readingList.book_id, bookId));

    revalidatePath('/reading-list');
    revalidatePath('/library');

    return { success: true };
  } catch (error) {
    console.error('[READING_LIST] Failed to remove from reading list:', error);
    return { success: false, error: 'Failed to remove from reading list' };
  }
}

/**
 * Check if a book is in the reading list
 */
export async function isInReadingList(bookId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: readingList.id })
      .from(readingList)
      .where(eq(readingList.book_id, bookId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[READING_LIST] Failed to check reading list:', error);
    return false;
  }
}

/**
 * Toggle a book in/out of the reading list
 */
export async function toggleReadingList(
  bookId: string
): Promise<{ success: boolean; isInList: boolean; error?: string }> {
  try {
    const inList = await isInReadingList(bookId);

    if (inList) {
      await removeFromReadingList(bookId);
      return { success: true, isInList: false };
    } else {
      await addToReadingList(bookId);
      return { success: true, isInList: true };
    }
  } catch (error) {
    console.error('[READING_LIST] Failed to toggle reading list:', error);
    return { success: false, isInList: false, error: 'Failed to toggle reading list' };
  }
}

/**
 * Reorder reading list items
 */
export async function reorderReadingList(
  itemId: string,
  newSortOrder: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(readingList)
      .set({ sort_order: newSortOrder })
      .where(eq(readingList.id, itemId));

    revalidatePath('/reading-list');

    return { success: true };
  } catch (error) {
    console.error('[READING_LIST] Failed to reorder reading list:', error);
    return { success: false, error: 'Failed to reorder reading list' };
  }
}

/**
 * Clear the entire reading list
 */
export async function clearReadingList(): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(readingList);

    revalidatePath('/reading-list');

    return { success: true };
  } catch (error) {
    console.error('[READING_LIST] Failed to clear reading list:', error);
    return { success: false, error: 'Failed to clear reading list' };
  }
}

/**
 * Get reading list count
 */
export async function getReadingListCount(): Promise<number> {
  try {
    const results = await db.select({ id: readingList.id }).from(readingList);
    return results.length;
  } catch (error) {
    console.error('[READING_LIST] Failed to get count:', error);
    return 0;
  }
}
