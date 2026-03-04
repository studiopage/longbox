'use server';

import { db } from '@/db';
import { activityEvents } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

const PAGE_SIZE = 25;

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  severity: string;
  createdAt: Date | null;
}

/**
 * Get the most recent activity events for the dashboard widget.
 */
export async function getRecentActivity(limit: number = 5): Promise<ActivityEvent[]> {
  const rows = await db
    .select()
    .from(activityEvents)
    .orderBy(desc(activityEvents.created_at))
    .limit(limit);

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    message: row.message,
    metadata: row.metadata as Record<string, unknown> | null,
    severity: row.severity,
    createdAt: row.created_at,
  }));
}

/**
 * Get paginated activity events with optional filters.
 */
export async function getActivityEvents(filters?: {
  type?: string;
  severity?: string;
  page?: number;
}): Promise<{ events: ActivityEvent[]; hasMore: boolean }> {
  const page = filters?.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];

  if (filters?.type && filters.type !== 'all') {
    const typeMap: Record<string, string[]> = {
      scans: ['scan_started', 'scan_complete'],
      matches: ['series_linked'],
      triage: ['triage_approved', 'triage_rejected'],
      reading: ['book_completed'],
      errors: ['error'],
    };
    const types = typeMap[filters.type];
    if (types) {
      conditions.push(sql`${activityEvents.type} = ANY(${types})`);
    }
  }

  if (filters?.severity && filters.severity !== 'all') {
    conditions.push(eq(activityEvents.severity, filters.severity));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(activityEvents)
    .where(whereClause)
    .orderBy(desc(activityEvents.created_at))
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = rows.length > PAGE_SIZE;
  const events = rows.slice(0, PAGE_SIZE).map(row => ({
    id: row.id,
    type: row.type,
    message: row.message,
    metadata: row.metadata as Record<string, unknown> | null,
    severity: row.severity,
    createdAt: row.created_at,
  }));

  return { events, hasMore };
}
