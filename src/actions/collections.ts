'use server';

import { db } from '@/db';
import { collections, collectionItems, books } from '@/db/schema';
import { eq, asc, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  coverBookId: string | null;
  coverUrl: string | null;
  itemCount: number;
  createdAt: Date | null;
}

export interface CollectionWithItems extends Collection {
  items: {
    id: string;
    bookId: string;
    bookTitle: string;
    bookNumber: string | null;
    sortOrder: number;
  }[];
}

/**
 * Create a new collection
 */
export async function createCollection(
  name: string,
  description?: string
): Promise<{ success: boolean; collection?: Collection; error?: string }> {
  try {
    const [newCollection] = await db.insert(collections).values({
      name,
      description: description || null,
    }).returning();

    revalidatePath('/collections');

    return {
      success: true,
      collection: {
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        coverBookId: newCollection.cover_book_id,
        coverUrl: null,
        itemCount: 0,
        createdAt: newCollection.created_at,
      },
    };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to create collection:', error);
    return { success: false, error: 'Failed to create collection' };
  }
}

/**
 * Get all collections
 */
export async function getCollections(): Promise<Collection[]> {
  try {
    const results = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        coverBookId: collections.cover_book_id,
        createdAt: collections.created_at,
      })
      .from(collections)
      .orderBy(asc(collections.name));

    // Get item counts for each collection
    const collectionsWithCounts = await Promise.all(
      results.map(async (col) => {
        const items = await db
          .select({ id: collectionItems.id })
          .from(collectionItems)
          .where(eq(collectionItems.collection_id, col.id));

        return {
          id: col.id,
          name: col.name,
          description: col.description,
          coverBookId: col.coverBookId,
          coverUrl: col.coverBookId ? `/api/cover/${col.coverBookId}` : null,
          itemCount: items.length,
          createdAt: col.createdAt,
        };
      })
    );

    return collectionsWithCounts;
  } catch (error) {
    console.error('[COLLECTIONS] Failed to get collections:', error);
    return [];
  }
}

/**
 * Get a single collection with its items
 */
export async function getCollection(collectionId: string): Promise<CollectionWithItems | null> {
  try {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection) return null;

    const items = await db
      .select({
        id: collectionItems.id,
        bookId: collectionItems.book_id,
        sortOrder: collectionItems.sort_order,
        bookTitle: books.title,
        bookNumber: books.number,
      })
      .from(collectionItems)
      .innerJoin(books, eq(collectionItems.book_id, books.id))
      .where(eq(collectionItems.collection_id, collectionId))
      .orderBy(asc(collectionItems.sort_order));

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      coverBookId: collection.cover_book_id,
      coverUrl: collection.cover_book_id ? `/api/cover/${collection.cover_book_id}` : null,
      itemCount: items.length,
      createdAt: collection.created_at,
      items: items.map((item) => ({
        id: item.id,
        bookId: item.bookId,
        bookTitle: item.bookTitle,
        bookNumber: item.bookNumber,
        sortOrder: item.sortOrder ?? 0,
      })),
    };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to get collection:', error);
    return null;
  }
}

/**
 * Add a book to a collection
 */
export async function addToCollection(
  collectionId: string,
  bookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current max sort order
    const existingItems = await db
      .select({ sortOrder: collectionItems.sort_order })
      .from(collectionItems)
      .where(eq(collectionItems.collection_id, collectionId))
      .orderBy(desc(collectionItems.sort_order))
      .limit(1);

    const nextSortOrder = existingItems.length > 0 ? (existingItems[0].sortOrder ?? 0) + 1 : 0;

    await db.insert(collectionItems).values({
      collection_id: collectionId,
      book_id: bookId,
      sort_order: nextSortOrder,
    }).onConflictDoNothing();

    // Set as cover if collection has no cover
    const [collection] = await db
      .select({ coverBookId: collections.cover_book_id })
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection.coverBookId) {
      await db
        .update(collections)
        .set({ cover_book_id: bookId, updated_at: new Date() })
        .where(eq(collections.id, collectionId));
    }

    revalidatePath('/collections');
    revalidatePath(`/collections/${collectionId}`);

    return { success: true };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to add to collection:', error);
    return { success: false, error: 'Failed to add to collection' };
  }
}

/**
 * Remove a book from a collection
 */
export async function removeFromCollection(
  collectionId: string,
  bookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(collectionItems)
      .where(and(
        eq(collectionItems.collection_id, collectionId),
        eq(collectionItems.book_id, bookId)
      ));

    revalidatePath('/collections');
    revalidatePath(`/collections/${collectionId}`);

    return { success: true };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to remove from collection:', error);
    return { success: false, error: 'Failed to remove from collection' };
  }
}

/**
 * Delete a collection
 */
export async function deleteCollection(
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(collections).where(eq(collections.id, collectionId));

    revalidatePath('/collections');

    return { success: true };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to delete collection:', error);
    return { success: false, error: 'Failed to delete collection' };
  }
}

/**
 * Update collection details
 */
export async function updateCollection(
  collectionId: string,
  data: { name?: string; description?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(collections)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(collections.id, collectionId));

    revalidatePath('/collections');
    revalidatePath(`/collections/${collectionId}`);

    return { success: true };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to update collection:', error);
    return { success: false, error: 'Failed to update collection' };
  }
}

/**
 * Get collections that contain a specific book
 */
export async function getBookCollections(bookId: string): Promise<string[]> {
  try {
    const results = await db
      .select({ collectionId: collectionItems.collection_id })
      .from(collectionItems)
      .where(eq(collectionItems.book_id, bookId));

    return results.map((r) => r.collectionId);
  } catch (error) {
    console.error('[COLLECTIONS] Failed to get book collections:', error);
    return [];
  }
}
