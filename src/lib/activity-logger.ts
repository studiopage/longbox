import { db } from '@/db';
import { activityEvents } from '@/db/schema';

export type ActivityEventType =
  | 'scan_started'
  | 'scan_complete'
  | 'series_linked'
  | 'error'
  | 'triage_approved'
  | 'triage_rejected'
  | 'book_completed'
  | 'collection_created'
  | 'collection_deleted'
  | 'request_created'
  | 'request_fulfilled'
  | 'request_deleted'
  | 'series_merged'
  | 'orphan_cleanup'
  | 'page_count_backfill'
  | 'media_validation';

export type ActivitySeverity = 'info' | 'warning' | 'error';

/**
 * Log an activity event to the activity_events table.
 * Fire-and-forget: errors are caught and logged to console, never thrown.
 */
export async function logEvent(
  type: ActivityEventType,
  message: string,
  metadata?: Record<string, unknown>,
  severity: ActivitySeverity = 'info'
): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      type,
      message,
      metadata: metadata ?? null,
      severity,
    });
  } catch (err) {
    // Never let activity logging break the caller
    console.error('[ACTIVITY] Failed to log event:', err);
  }
}
