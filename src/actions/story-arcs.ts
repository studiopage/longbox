'use server';

import { db } from '@/db';
import { books, series, arc_reading_orders, arc_reading_progress } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { logEvent } from '@/lib/activity-logger';

/**
 * Story Arc Reading Engine
 * Phase 3: Compute optimal reading order for story arcs
 * 
 * Arcs contain issues from potentially multiple series
 * Reading order determined by:
 * 1. Publication date (preferred)
 * 2. Metron arc sequence (if available)
 * 3. Issue number within series (fallback)
 */

interface ArcIssue {
  bookId: string;
  issueNumber: string;
  seriesId: string;
  seriesName: string;
  publishedDate: Date | null;
  title: string;
}

interface ComputedArcOrder {
  arcName: string;
  issues: ArcIssue[];
  seriesIds: string[];
  issueCount: number;
  earliestDate: Date | null;
  latestDate: Date | null;
  confidence: number; // 0-100
  source: 'auto' | 'metron' | 'manual';
}

/**
 * Compute reading order for a story arc
 * Scans all books with this arc in story_arcs metadata
 * Orders by publication_date, falls back to issue number parsing
 */
export async function computeArcReadingOrder(
  arcName: string
): Promise<ComputedArcOrder | null> {
  try {
    // Find all books with this arc
    const booksWithArc = await db
      .select({
        id: books.id,
        title: books.title,
        number: books.number,
        published_date: books.published_date,
        story_arcs: books.story_arcs,
        seriesId: books.series_id,
        seriesName: series.name,
      })
      .from(books)
      .innerJoin(series, eq(books.series_id, series.id))
      .where(isNotNull(books.story_arcs));

    // Filter to just those with the target arc
    const arcIssues: ArcIssue[] = [];
    const seriesSet = new Set<string>();

    for (const book of booksWithArc) {
      const storyArcs = (book.story_arcs as any) || [];
      if (!Array.isArray(storyArcs)) continue;

      const hasArc = storyArcs.some((arc: any) =>
        (typeof arc === 'string' && arc.toLowerCase() === arcName.toLowerCase()) ||
        (typeof arc === 'object' && arc.name && arc.name.toLowerCase() === arcName.toLowerCase())
      );

      if (hasArc) {
        arcIssues.push({
          bookId: book.id,
          issueNumber: book.number || '0',
          seriesId: book.seriesId,
          seriesName: book.seriesName,
          publishedDate: book.published_date,
          title: book.title,
        });
        seriesSet.add(book.seriesId);
      }
    }

    if (arcIssues.length === 0) return null;

    // Sort by publication date, then by issue number as fallback
    const sorted = arcIssues.sort((a, b) => {
      if (a.publishedDate && b.publishedDate) {
        return a.publishedDate.getTime() - b.publishedDate.getTime();
      }
      // Fallback: sort by issue number (numeric)
      const aNum = parseInt(a.issueNumber.split(/[^\d]/)[0]) || 0;
      const bNum = parseInt(b.issueNumber.split(/[^\d]/)[0]) || 0;
      return aNum - bNum;
    });

    // Calculate dates and confidence
    const dates = sorted
      .map(i => i.publishedDate)
      .filter((d): d is Date => d !== null);
    const earliestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const latestDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    // Confidence: higher if we have good date data
    const dateConfidence = (dates.length / arcIssues.length) * 100;

    return {
      arcName,
      issues: sorted,
      seriesIds: Array.from(seriesSet),
      issueCount: sorted.length,
      earliestDate,
      latestDate,
      confidence: Math.round(dateConfidence),
      source: 'auto',
    };
  } catch (err) {
    console.error('[ARC] Compute reading order failed:', err);
    return null;
  }
}

/**
 * Store computed arc reading order
 */
export async function saveArcReadingOrder(
  arcOrder: ComputedArcOrder
): Promise<boolean> {
  try {
    await db
      .insert(arc_reading_orders)
      .values({
        arc_name: arcOrder.arcName,
        book_ids: arcOrder.issues.map(i => i.bookId),
        issue_numbers: arcOrder.issues.map(i => i.issueNumber),
        first_appearance_date: arcOrder.earliestDate?.toISOString().split('T')[0],
        completion_date: arcOrder.latestDate?.toISOString().split('T')[0],
        issue_count: arcOrder.issueCount,
        series_ids: arcOrder.seriesIds,
        source: arcOrder.source,
        confidence: arcOrder.confidence,
      })
      .onConflictDoUpdate({
        target: arc_reading_orders.arc_name,
        set: {
          book_ids: arcOrder.issues.map(i => i.bookId),
          issue_numbers: arcOrder.issues.map(i => i.issueNumber),
          first_appearance_date: arcOrder.earliestDate?.toISOString().split('T')[0],
          completion_date: arcOrder.latestDate?.toISOString().split('T')[0],
          issue_count: arcOrder.issueCount,
          series_ids: arcOrder.seriesIds,
          confidence: arcOrder.confidence,
          updated_at: new Date(),
        },
      });

    return true;
  } catch (err) {
    console.error('[ARC] Save reading order failed:', err);
    return false;
  }
}

/**
 * Get recommended reading order for an arc
 */
export async function getArcReadingOrder(arcName: string) {
  try {
    const [order] = await db
      .select()
      .from(arc_reading_orders)
      .where(eq(arc_reading_orders.arc_name, arcName))
      .limit(1);

    return order || null;
  } catch (err) {
    console.error('[ARC] Fetch reading order failed:', err);
    return null;
  }
}

/**
 * Track user progress through a story arc
 */
export async function updateArcProgress(
  userId: string,
  arcName: string,
  issueReadId: string,
  totalIssues: number
): Promise<boolean> {
  try {
    const existing = await db
      .select()
      .from(arc_reading_progress)
      .where(
        and(
          eq(arc_reading_progress.user_id, userId),
          eq(arc_reading_progress.arc_name, arcName)
        )
      )
      .limit(1);

    const issuesRead = existing?.[0]?.issues_read || 0;
    const newCount = issuesRead + 1;
    const completionPct = Math.round((newCount / totalIssues) * 100);
    const isCompleted = newCount >= totalIssues;

    await db
      .insert(arc_reading_progress)
      .values({
        user_id: userId,
        arc_name: arcName,
        total_issues: totalIssues,
        issues_read: newCount,
        last_issue_read: issueReadId,
        arc_completion_pct: completionPct,
        completed_at: isCompleted ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [arc_reading_progress.user_id, arc_reading_progress.arc_name],
        set: {
          issues_read: newCount,
          last_issue_read: issueReadId,
          arc_completion_pct: completionPct,
          completed_at: isCompleted ? new Date() : null,
          updated_at: new Date(),
        },
      });

    return true;
  } catch (err) {
    console.error('[ARC] Update progress failed:', err);
    return false;
  }
}

/**
 * Get user's arc reading progress
 */
export async function getUserArcProgress(userId: string, arcName: string) {
  try {
    const [progress] = await db
      .select()
      .from(arc_reading_progress)
      .where(
        and(
          eq(arc_reading_progress.user_id, userId),
          eq(arc_reading_progress.arc_name, arcName)
        )
      )
      .limit(1);

    return progress || null;
  } catch (err) {
    console.error('[ARC] Fetch progress failed:', err);
    return null;
  }
}

/**
 * Get all arcs user has made progress on
 */
export async function getUserArcsProgress(userId: string) {
  try {
    return await db
      .select()
      .from(arc_reading_progress)
      .where(eq(arc_reading_progress.user_id, userId));
  } catch (err) {
    console.error('[ARC] Fetch user arcs failed:', err);
    return [];
  }
}

/**
 * Batch compute reading orders for all detected arcs
 */
export async function computeAllArcReadingOrders(): Promise<number> {
  try {
    // Find all unique arc names across library
    const allBooks = await db
      .select({ story_arcs: books.story_arcs })
      .from(books)
      .where(isNotNull(books.story_arcs));

    const arcNames = new Set<string>();
    for (const book of allBooks) {
      const arcs = (book.story_arcs as any) || [];
      if (Array.isArray(arcs)) {
        arcs.forEach((arc: any) => {
          const name = typeof arc === 'string' ? arc : (arc.name || '');
          if (name) arcNames.add(name);
        });
      }
    }

    let computed = 0;
    for (const arcName of arcNames) {
      const order = await computeArcReadingOrder(arcName);
      if (order) {
        const saved = await saveArcReadingOrder(order);
        if (saved) computed++;
      }
    }

    await logEvent(
      'metadata_enriched',
      `Computed reading orders for ${computed} story arcs`,
      { arcsCount: computed, totalDetected: arcNames.size },
      'info'
    );

    return computed;
  } catch (err) {
    console.error('[ARC] Batch compute failed:', err);
    return 0;
  }
}
