'use server';

import { db } from '@/db';
import { triageQueue, series, books } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import path from 'path';
import { logEvent } from '@/lib/activity-logger';

/** Escape SQL LIKE wildcards (% and _) to prevent pattern injection. */
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

// =====================
// Types
// =====================

export interface TriageGroup {
  folderName: string;
  folderPath: string;
  items: TriageItem[];
  suggestedSeriesId: string | null;
  suggestedSeriesName: string | null;
  avgConfidence: number;
}

export interface TriageItem {
  id: string;
  filePath: string;
  fileSize: number;
  suggestedSeries: string | null;
  suggestedTitle: string | null;
  suggestedNumber: string | null;
  matchConfidence: number;
  matchedSeriesId: string | null;
  matchedSeriesName: string | null;
  signals: Record<string, unknown> | null;
  status: string;
  createdAt: Date | null;
}

// =====================
// Queries
// =====================

/**
 * Get all pending triage items, grouped by parent folder.
 * Each group contains items from the same directory, sorted by item count descending.
 */
export async function getTriageItems(): Promise<TriageGroup[]> {
  const rows = await db
    .select({
      id: triageQueue.id,
      filePath: triageQueue.file_path,
      fileSize: triageQueue.file_size,
      suggestedSeries: triageQueue.suggested_series,
      suggestedTitle: triageQueue.suggested_title,
      suggestedNumber: triageQueue.suggested_number,
      matchConfidence: triageQueue.match_confidence,
      matchedSeriesId: triageQueue.matched_series_id,
      signals: triageQueue.signals,
      status: triageQueue.status,
      createdAt: triageQueue.created_at,
      seriesName: series.name,
    })
    .from(triageQueue)
    .leftJoin(series, eq(triageQueue.matched_series_id, series.id))
    .where(eq(triageQueue.status, 'pending'))
    .orderBy(desc(triageQueue.created_at));

  // Group by parent folder path
  const groupMap = new Map<string, TriageItem[]>();

  for (const row of rows) {
    const folderPath = path.dirname(row.filePath);
    const item: TriageItem = {
      id: row.id,
      filePath: row.filePath,
      fileSize: row.fileSize,
      suggestedSeries: row.suggestedSeries,
      suggestedTitle: row.suggestedTitle,
      suggestedNumber: row.suggestedNumber,
      matchConfidence: row.matchConfidence ?? 0,
      matchedSeriesId: row.matchedSeriesId,
      matchedSeriesName: row.seriesName,
      signals: row.signals as Record<string, unknown> | null,
      status: row.status,
      createdAt: row.createdAt,
    };

    const existing = groupMap.get(folderPath);
    if (existing) {
      existing.push(item);
    } else {
      groupMap.set(folderPath, [item]);
    }
  }

  // Build groups with aggregated metadata
  const groups: TriageGroup[] = [];

  for (const [folderPath, items] of groupMap) {
    // Calculate average confidence
    const avgConfidence =
      items.reduce((sum, item) => sum + item.matchConfidence, 0) / items.length;

    // Find the most common suggested series (by matched_series_id or suggested_series name)
    const seriesIdCounts = new Map<string, number>();
    const seriesNameMap = new Map<string, string>();

    for (const item of items) {
      if (item.matchedSeriesId) {
        seriesIdCounts.set(
          item.matchedSeriesId,
          (seriesIdCounts.get(item.matchedSeriesId) ?? 0) + 1
        );
        if (item.matchedSeriesName) {
          seriesNameMap.set(item.matchedSeriesId, item.matchedSeriesName);
        }
      }
    }

    let suggestedSeriesId: string | null = null;
    let suggestedSeriesName: string | null = null;

    if (seriesIdCounts.size > 0) {
      // Pick the series ID that appears most often
      let maxCount = 0;
      for (const [sid, count] of seriesIdCounts) {
        if (count > maxCount) {
          maxCount = count;
          suggestedSeriesId = sid;
          suggestedSeriesName = seriesNameMap.get(sid) ?? null;
        }
      }
    } else {
      // Fall back to the most common suggested_series text
      const nameCounts = new Map<string, number>();
      for (const item of items) {
        if (item.suggestedSeries) {
          nameCounts.set(
            item.suggestedSeries,
            (nameCounts.get(item.suggestedSeries) ?? 0) + 1
          );
        }
      }
      let maxCount = 0;
      for (const [name, count] of nameCounts) {
        if (count > maxCount) {
          maxCount = count;
          suggestedSeriesName = name;
        }
      }
    }

    groups.push({
      folderName: path.basename(folderPath),
      folderPath,
      items,
      suggestedSeriesId,
      suggestedSeriesName,
      avgConfidence,
    });
  }

  // Sort groups by item count descending
  groups.sort((a, b) => b.items.length - a.items.length);

  return groups;
}

/**
 * Get counts of pending triage items by confidence tier.
 */
export async function getTriageCounts(): Promise<{
  pending: number;
  high: number;
  medium: number;
  low: number;
}> {
  const rows = await db
    .select({ matchConfidence: triageQueue.match_confidence })
    .from(triageQueue)
    .where(eq(triageQueue.status, 'pending'));

  let high = 0;
  let medium = 0;
  let low = 0;

  for (const row of rows) {
    const confidence = row.matchConfidence ?? 0;
    if (confidence >= 90) {
      high++;
    } else if (confidence >= 60) {
      medium++;
    } else {
      low++;
    }
  }

  return {
    pending: rows.length,
    high,
    medium,
    low,
  };
}

// =====================
// Mutations
// =====================

/**
 * Approve all pending triage items in a folder, linking them to a series.
 * If seriesId is null, creates a new local series from the first item's suggested name.
 */
export async function approveGroup(
  folderPath: string,
  seriesId: string | null
): Promise<{ success: boolean; count?: number; message?: string }> {
  try {
    // Select all pending items in this folder
    const items = await db
      .select()
      .from(triageQueue)
      .where(
        and(
          sql`${triageQueue.file_path} LIKE ${escapeLikePattern(folderPath) + '/%'} ESCAPE '\\'`,
          eq(triageQueue.status, 'pending')
        )
      );

    if (items.length === 0) {
      return { success: false, message: 'No pending items found in this folder.' };
    }

    // If no series provided, create a new local series with metadata from ComicInfo
    let targetSeriesId = seriesId;
    if (!targetSeriesId) {
      const firstItem = items[0];
      const seriesName =
        firstItem.suggested_series || path.basename(folderPath) || 'Unknown Series';

      // Extract metadata from first item's ComicInfo signals
      const firstSignals = (firstItem.signals ?? {}) as Record<string, unknown>;
      const firstCi = (firstSignals.comicinfo ?? {}) as Record<string, unknown>;

      const [newSeries] = await db
        .insert(series)
        .values({
          name: seriesName,
          status: 'ongoing',
          publisher: (firstCi.publisher as string) || null,
          description: (firstCi.summary as string) || null,
          year: typeof firstCi.year === 'number' ? firstCi.year : null,
        })
        .returning();

      targetSeriesId = newSeries.id;
    } else {
      // Existing series — enrich empty fields from first item's ComicInfo
      const firstItem = items[0];
      const firstSignals = (firstItem.signals ?? {}) as Record<string, unknown>;
      const firstCi = (firstSignals.comicinfo ?? {}) as Record<string, unknown>;

      if (firstCi.publisher || firstCi.summary || firstCi.year) {
        const [existing] = await db
          .select({ publisher: series.publisher, description: series.description, year: series.year })
          .from(series)
          .where(eq(series.id, targetSeriesId))
          .limit(1);

        if (existing) {
          const updates: Record<string, unknown> = {};
          if (!existing.publisher && firstCi.publisher) updates.publisher = firstCi.publisher as string;
          if (!existing.description && firstCi.summary) updates.description = firstCi.summary as string;
          if (!existing.year && typeof firstCi.year === 'number') updates.year = firstCi.year;
          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date();
            await db.update(series).set(updates).where(eq(series.id, targetSeriesId));
          }
        }
      }
    }

    // Process each item: insert into books, mark triage row as approved
    for (const item of items) {
      const signals = (item.signals ?? {}) as Record<string, unknown>;
      const ci = (signals.comicinfo ?? {}) as Record<string, unknown>;

      const title =
        (item.suggested_title as string) ||
        (ci.title as string) ||
        path.basename(item.file_path, path.extname(item.file_path));
      const number = (item.suggested_number as string) || (ci.number as string) || null;
      const publisher = (ci.publisher as string) || null;
      const authors =
        [ci.writer, ci.penciller].filter(Boolean).join(', ') || null;
      const pageCount =
        typeof ci.pageCount === 'number' ? ci.pageCount : null;
      const summary = (ci.summary as string) || null;

      // Determine match flags based on confidence
      const matchFlags: string[] = [];
      const confidence = item.match_confidence ?? 0;
      if (confidence < 80) {
        matchFlags.push('low_confidence');
      }
      if (!ci.title && !ci.writer) {
        matchFlags.push('needs_metadata');
      }

      await db
        .insert(books)
        .values({
          series_id: targetSeriesId,
          file_path: item.file_path,
          file_size: item.file_size,
          title,
          number,
          page_count: pageCount ?? 0,
          summary,
          publisher,
          authors,
          match_flags: matchFlags.length > 0 ? matchFlags : null,
        })
        .onConflictDoUpdate({
          target: books.file_path,
          set: {
            series_id: targetSeriesId,
            title,
            number,
            page_count: pageCount ?? 0,
            summary,
            publisher,
            authors,
            match_flags: matchFlags.length > 0 ? matchFlags : null,
            updated_at: new Date(),
          },
        });

      // Mark triage item as approved
      await db
        .update(triageQueue)
        .set({ status: 'approved' })
        .where(eq(triageQueue.id, item.id));
    }

    revalidatePath('/triage');
    revalidatePath('/library');
    revalidatePath('/');

    await logEvent('triage_approved', `Approved ${items.length} files from ${path.basename(folderPath)}`, {
      folderPath,
      count: items.length,
      seriesId: targetSeriesId,
    });

    return { success: true, count: items.length };
  } catch (error) {
    console.error('approveGroup error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reject all pending triage items in a folder.
 */
export async function rejectGroup(folderPath: string): Promise<void> {
  await db
    .update(triageQueue)
    .set({ status: 'rejected' })
    .where(
      and(
        sql`${triageQueue.file_path} LIKE ${escapeLikePattern(folderPath) + '/%'} ESCAPE '\\'`,
        eq(triageQueue.status, 'pending')
      )
    );

  revalidatePath('/triage');

  await logEvent('triage_rejected', `Rejected folder: ${path.basename(folderPath)}`, {
    folderPath,
  });
}

/**
 * Approve a single triage item, linking it to a specific series.
 */
export async function approveFile(
  itemId: string,
  seriesId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Select the triage item
    const [item] = await db
      .select()
      .from(triageQueue)
      .where(eq(triageQueue.id, itemId))
      .limit(1);

    if (!item) {
      return { success: false, message: 'Triage item not found.' };
    }

    const signals = (item.signals ?? {}) as Record<string, unknown>;
    const ci = (signals.comicinfo ?? {}) as Record<string, unknown>;

    const title =
      (item.suggested_title as string) ||
      (ci.title as string) ||
      path.basename(item.file_path, path.extname(item.file_path));
    const number = (item.suggested_number as string) || (ci.number as string) || null;
    const publisher = (ci.publisher as string) || null;
    const authors =
      [ci.writer, ci.penciller].filter(Boolean).join(', ') || null;
    const pageCount =
      typeof ci.pageCount === 'number' ? ci.pageCount : null;
    const summary = (ci.summary as string) || null;

    const matchFlags: string[] = [];
    const confidence = item.match_confidence ?? 0;
    if (confidence < 80) {
      matchFlags.push('low_confidence');
    }
    if (!ci.title && !ci.writer) {
      matchFlags.push('needs_metadata');
    }

    // Insert into books
    await db
      .insert(books)
      .values({
        series_id: seriesId,
        file_path: item.file_path,
        file_size: item.file_size,
        title,
        number,
        page_count: pageCount ?? 0,
        summary,
        publisher,
        authors,
        match_flags: matchFlags.length > 0 ? matchFlags : null,
      })
      .onConflictDoUpdate({
        target: books.file_path,
        set: {
          series_id: seriesId,
          title,
          number,
          page_count: pageCount ?? 0,
          summary,
          publisher,
          authors,
          match_flags: matchFlags.length > 0 ? matchFlags : null,
          updated_at: new Date(),
        },
      });

    // Mark triage item as approved
    await db
      .update(triageQueue)
      .set({ status: 'approved' })
      .where(eq(triageQueue.id, itemId));

    revalidatePath('/triage');
    revalidatePath('/library');

    await logEvent('triage_approved', `Approved file: ${path.basename(item.file_path)}`, {
      itemId,
      seriesId,
      filePath: item.file_path,
    });

    return { success: true };
  } catch (error) {
    console.error('approveFile error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
