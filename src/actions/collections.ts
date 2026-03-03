'use server';

import { db } from '@/db';
import { collections, collectionItems, books } from '@/db/schema';
import { eq, asc, desc, and, count as drizzleCount } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { SmartRules } from '@/types/longbox';
import { getCachedSmartCollectionCount, getCachedSmartCollectionBooks, getSmartCollectionCount, getSmartCollectionBooks } from '@/lib/rules-engine';
import { auth } from '@/lib/auth';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  coverBookId: string | null;
  coverUrl: string | null;
  itemCount: number;
  createdAt: Date | null;
  smartRules: SmartRules | null;
  pinned: boolean;
  icon: string | null;
  sortPreference: string | null;
  isSmart: boolean;
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
 * Create a new collection (manual or smart)
 */
export async function createCollection(
  name: string,
  options?: {
    description?: string;
    smartRules?: SmartRules;
    pinned?: boolean;
    icon?: string;
    sortPreference?: string;
  }
): Promise<{ success: boolean; collection?: Collection; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const [newCollection] = await db.insert(collections).values({
      name,
      user_id: userId ?? null,
      description: options?.description || null,
      smart_rules: options?.smartRules ?? null,
      pinned: options?.pinned ?? false,
      icon: options?.icon ?? null,
      sort_preference: options?.sortPreference ?? null,
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
        smartRules: newCollection.smart_rules as SmartRules | null,
        pinned: newCollection.pinned ?? false,
        icon: newCollection.icon,
        sortPreference: newCollection.sort_preference,
        isSmart: newCollection.smart_rules !== null,
      },
    };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to create collection:', error);
    return { success: false, error: 'Failed to create collection' };
  }
}

/**
 * Get all collections with counts (smart collections use rule engine, manual use collectionItems)
 */
export async function getCollections(): Promise<Collection[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? '';

    const results = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        coverBookId: collections.cover_book_id,
        createdAt: collections.created_at,
        smartRules: collections.smart_rules,
        pinned: collections.pinned,
        icon: collections.icon,
        sortPreference: collections.sort_preference,
      })
      .from(collections)
      .orderBy(asc(collections.name));

    const collectionsWithCounts = await Promise.all(
      results.map(async (col) => {
        const smartRules = col.smartRules as SmartRules | null;
        const isSmart = smartRules !== null;

        let itemCount = 0;
        if (isSmart) {
          itemCount = await getCachedSmartCollectionCount(
            JSON.stringify(smartRules),
            userId
          );
        } else {
          const [result] = await db
            .select({ count: drizzleCount() })
            .from(collectionItems)
            .where(eq(collectionItems.collection_id, col.id));
          itemCount = result?.count ?? 0;
        }

        return {
          id: col.id,
          name: col.name,
          description: col.description,
          coverBookId: col.coverBookId,
          coverUrl: col.coverBookId ? `/api/cover/${col.coverBookId}` : null,
          itemCount,
          createdAt: col.createdAt,
          smartRules,
          pinned: col.pinned ?? false,
          icon: col.icon,
          sortPreference: col.sortPreference,
          isSmart,
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
 * Get a single collection with its items (smart collections use rule engine)
 */
export async function getCollection(collectionId: string): Promise<CollectionWithItems | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? '';

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection) return null;

    const smartRules = collection.smart_rules as SmartRules | null;
    const isSmart = smartRules !== null;

    let items: CollectionWithItems['items'];

    if (isSmart) {
      const smartBooks = await getCachedSmartCollectionBooks(
        JSON.stringify(smartRules),
        userId,
        collection.sort_preference
      );
      items = smartBooks.map((book, index) => ({
        id: book.id,
        bookId: book.id,
        bookTitle: book.title,
        bookNumber: book.number,
        sortOrder: index,
      }));
    } else {
      const manualItems = await db
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

      items = manualItems.map((item) => ({
        id: item.id,
        bookId: item.bookId,
        bookTitle: item.bookTitle,
        bookNumber: item.bookNumber,
        sortOrder: item.sortOrder ?? 0,
      }));
    }

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      coverBookId: collection.cover_book_id,
      coverUrl: collection.cover_book_id ? `/api/cover/${collection.cover_book_id}` : null,
      itemCount: items.length,
      createdAt: collection.created_at,
      smartRules,
      pinned: collection.pinned ?? false,
      icon: collection.icon,
      sortPreference: collection.sort_preference,
      isSmart,
      items,
    };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to get collection:', error);
    return null;
  }
}

/**
 * Add a book to a manual collection
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
 * Remove a book from a manual collection
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
 * Update collection details (supports smart collection fields)
 */
export async function updateCollection(
  collectionId: string,
  data: {
    name?: string;
    description?: string;
    smartRules?: SmartRules | null;
    pinned?: boolean;
    icon?: string | null;
    sortPreference?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.smartRules !== undefined) updateData.smart_rules = data.smartRules;
    if (data.pinned !== undefined) updateData.pinned = data.pinned;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.sortPreference !== undefined) updateData.sort_preference = data.sortPreference;

    await db
      .update(collections)
      .set(updateData)
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
 * Get collections that contain a specific book (manual collections only)
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

/**
 * Preview smart collection results (uncached, for rule builder live preview)
 */
export async function getSmartCollectionPreview(
  rules: SmartRules,
  limit?: number
): Promise<{ count: number; books: { id: string; title: string }[] }> {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? '';

    const [countResult, bookResults] = await Promise.all([
      getSmartCollectionCount(rules, userId),
      getSmartCollectionBooks(rules, userId, null, limit ?? 6),
    ]);

    return {
      count: countResult,
      books: bookResults.map((b) => ({ id: b.id, title: b.title })),
    };
  } catch (error) {
    console.error('[COLLECTIONS] Failed to get smart collection preview:', error);
    return { count: 0, books: [] };
  }
}

/**
 * Get pinned collections (for sidebar and mobile chips)
 */
export async function getPinnedCollections(): Promise<Collection[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? '';

    const results = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        coverBookId: collections.cover_book_id,
        createdAt: collections.created_at,
        smartRules: collections.smart_rules,
        pinned: collections.pinned,
        icon: collections.icon,
        sortPreference: collections.sort_preference,
      })
      .from(collections)
      .where(eq(collections.pinned, true))
      .orderBy(asc(collections.name));

    const collectionsWithCounts = await Promise.all(
      results.map(async (col) => {
        const smartRules = col.smartRules as SmartRules | null;
        const isSmart = smartRules !== null;

        let itemCount = 0;
        if (isSmart) {
          itemCount = await getCachedSmartCollectionCount(
            JSON.stringify(smartRules),
            userId
          );
        } else {
          const [result] = await db
            .select({ count: drizzleCount() })
            .from(collectionItems)
            .where(eq(collectionItems.collection_id, col.id));
          itemCount = result?.count ?? 0;
        }

        return {
          id: col.id,
          name: col.name,
          description: col.description,
          coverBookId: col.coverBookId,
          coverUrl: col.coverBookId ? `/api/cover/${col.coverBookId}` : null,
          itemCount,
          createdAt: col.createdAt,
          smartRules,
          pinned: true,
          icon: col.icon,
          sortPreference: col.sortPreference,
          isSmart,
        };
      })
    );

    return collectionsWithCounts;
  } catch (error) {
    console.error('[COLLECTIONS] Failed to get pinned collections:', error);
    return [];
  }
}

/**
 * Seed starter smart collections if none exist for the user.
 * Idempotent — only creates if user has zero collections.
 */
export async function seedStarterCollections(userId: string): Promise<void> {
  try {
    const [existing] = await db
      .select({ count: drizzleCount() })
      .from(collections)
      .where(eq(collections.user_id, userId));

    if ((existing?.count ?? 0) > 0) return;

    const starterCollections = [
      {
        name: 'Unread',
        icon: 'BookOpen',
        pinned: true,
        smart_rules: {
          match: 'all' as const,
          conditions: [{ field: 'reading_status' as const, operator: 'is' as const, value: 'unread' }],
        },
        sort_preference: 'date_added_desc',
      },
      {
        name: 'Recently Added',
        icon: 'Clock',
        pinned: true,
        smart_rules: {
          match: 'all' as const,
          conditions: [{ field: 'date_added' as const, operator: 'within_last' as const, value: '30' }],
        },
        sort_preference: 'date_added_desc',
      },
      {
        name: 'Needs Metadata',
        icon: 'AlertTriangle',
        pinned: false,
        smart_rules: {
          match: 'all' as const,
          conditions: [{ field: 'has_comicvine_id' as const, operator: 'is_false' as const, value: '' }],
        },
        sort_preference: 'title_asc',
      },
      {
        name: 'Ongoing Series',
        icon: 'Flame',
        pinned: false,
        smart_rules: {
          match: 'all' as const,
          conditions: [{ field: 'series_status' as const, operator: 'is' as const, value: 'ongoing' }],
        },
        sort_preference: 'title_asc',
      },
    ];

    await db.insert(collections).values(
      starterCollections.map((c) => ({
        user_id: userId,
        name: c.name,
        icon: c.icon,
        pinned: c.pinned,
        smart_rules: c.smart_rules,
        sort_preference: c.sort_preference,
      }))
    );
  } catch (error) {
    console.error('[COLLECTIONS] Failed to seed starter collections:', error);
  }
}
