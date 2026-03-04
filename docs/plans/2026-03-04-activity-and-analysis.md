# Phase 3: Activity & Analysis Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add activity event logging throughout the app and a library analytics page with composition, metadata health, series completion, and reading stats.

**Architecture:** New `activity_events` table with a `logEvent()` helper instrumented at ~10 call sites (scanner, pipeline, triage, reading, collections). Dashboard gets a "Recent Activity" widget. New `/activity` page with filters and date grouping. New `/analysis` page with four sections using Recharts for bar charts and sparklines, Radix Progress for health bars.

**Tech Stack:** Drizzle ORM (schema + queries), Recharts (bar charts, sparklines), date-fns (relative timestamps), Radix Progress (health bars), Next.js server components + server actions.

**Design doc:** `docs/plans/2026-03-04-activity-and-analysis-design.md`

---

## Batch 1: Schema + Activity Logger

### Task 1: Add `activityEvents` table to schema

**Files:**
- Modify: `src/db/schema.ts:363` (after `readingList` table, before relations block)

**Step 1:** Add the `activityEvents` table definition after the `readingList` table (after line 363) and before the relations block (line 365). Insert this code:

```typescript
// =====================
// ACTIVITY EVENTS
// =====================

export const activityEvents = pgTable('activity_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  severity: text('severity').notNull().default('info'),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => ({
  createdAtIdx: index('activity_events_created_at_idx').on(t.created_at),
  typeIdx: index('activity_events_type_idx').on(t.type),
}));
```

All imports (`pgTable`, `uuid`, `text`, `jsonb`, `timestamp`, `index`) are already present at line 1.

**Step 2:** Push schema to DB:

```bash
npx drizzle-kit push
```

Expected: Table `activity_events` created with columns id, type, message, metadata, severity, created_at and two indexes.

**Step 3:** Verify build:

```bash
npm run build
```

Expected: Build succeeds.

**Step 4:** Commit:

```bash
git add src/db/schema.ts
git commit -m "feat: add activity_events table to schema"
```

---

### Task 2: Create `logEvent()` helper

**Files:**
- Create: `src/lib/activity-logger.ts`

**Step 1:** Create the activity logger module:

```typescript
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
  | 'collection_deleted';

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
```

**Step 2:** Verify build:

```bash
npm run build
```

Expected: Build succeeds.

**Step 3:** Commit:

```bash
git add src/lib/activity-logger.ts
git commit -m "feat: add logEvent() activity logger helper"
```

---

## Batch 2: Instrument Existing Code

### Task 3: Instrument unified-scanner.ts

**Files:**
- Modify: `src/lib/scanner/unified-scanner.ts`

**Step 1:** Add import at top of file (after line 8):

```typescript
import { logEvent } from '@/lib/activity-logger';
```

**Step 2:** After the scan job is created (after line 99 `scannerProgress.startScan(totalFiles);`), add:

```typescript
    await logEvent('scan_started', `Scan started: ${totalFiles} files to process`, {
      jobId: job.id,
      totalFiles,
      libraryPath,
    });
```

**Step 3:** After the scan completes successfully (after line 175, before the return on line 176), add:

```typescript
    await logEvent('scan_complete', `Scan complete in ${duration}s. Matched: ${matched}, Triaged: ${triaged}, Errors: ${errors}`, {
      jobId: job.id,
      duration,
      matched,
      triaged,
      skipped,
      errors,
      totalFiles: allFiles.length,
    });
```

**Step 4:** In the catch block (after line 188 `scannerProgress.errorScan(message);`), add:

```typescript
    await logEvent('error', `Scan failed: ${message}`, {
      jobId: job.id,
    }, 'error');
```

**Step 5:** After the path inaccessible error (after line 74 `scannerProgress.errorScan(msg);`), add:

```typescript
    await logEvent('error', msg, { libraryPath }, 'error');
```

**Step 6:** Verify build:

```bash
npm run build
```

**Step 7:** Commit:

```bash
git add src/lib/scanner/unified-scanner.ts
git commit -m "feat: instrument scanner with activity logging"
```

---

### Task 4: Instrument triage.ts

**Files:**
- Modify: `src/actions/triage.ts`

**Step 1:** Add import at top (after line 7):

```typescript
import { logEvent } from '@/lib/activity-logger';
```

**Step 2:** In `approveGroup()`, after `return { success: true, count: items.length };` on line 317, insert **before** the return:

```typescript
    await logEvent('triage_approved', `Approved ${items.length} files from ${path.basename(folderPath)}`, {
      folderPath,
      count: items.length,
      seriesId: targetSeriesId,
    });
```

**Step 3:** In `rejectGroup()`, after `revalidatePath('/triage');` on line 341, add:

```typescript
  await logEvent('triage_rejected', `Rejected folder: ${path.basename(folderPath)}`, {
    folderPath,
  });
```

**Step 4:** In `approveFile()`, before `return { success: true };` on line 426, add:

```typescript
    await logEvent('triage_approved', `Approved file: ${path.basename(item.file_path)}`, {
      itemId,
      seriesId,
      filePath: item.file_path,
    });
```

**Step 5:** Verify build:

```bash
npm run build
```

**Step 6:** Commit:

```bash
git add src/actions/triage.ts
git commit -m "feat: instrument triage actions with activity logging"
```

---

### Task 5: Instrument reading-progress.ts and collections.ts

**Files:**
- Modify: `src/lib/data/reading-progress.ts`
- Modify: `src/actions/collections.ts`

**Step 1:** In `reading-progress.ts`, add import after line 9:

```typescript
import { logEvent } from '@/lib/activity-logger';
```

**Step 2:** In `markAsCompleted()` (line 117-122), after the `updateReadingProgress` call on line 121, add:

```typescript
  await logEvent('book_completed', 'Book marked as completed', { bookId });
```

The function becomes:
```typescript
export async function markAsCompleted(
  bookId: string,
  totalPages: number
): Promise<void> {
  await updateReadingProgress(bookId, totalPages, totalPages);
  await logEvent('book_completed', 'Book marked as completed', { bookId });
}
```

**Step 3:** In `collections.ts`, add import (after the existing imports at the top of the file):

```typescript
import { logEvent } from '@/lib/activity-logger';
```

**Step 4:** In `createCollection()`, after `revalidatePath('/collections');` on line 63, add:

```typescript
    await logEvent('collection_created', `Collection created: ${name}`, {
      collectionId: newCollection.id,
      name,
      isSmart: !!options?.smartRules,
    });
```

**Step 5:** In `deleteCollection()`, after the `db.delete` call on line 312, add:

```typescript
    await logEvent('collection_deleted', `Collection deleted`, { collectionId });
```

**Step 6:** Verify build:

```bash
npm run build
```

**Step 7:** Commit:

```bash
git add src/lib/data/reading-progress.ts src/actions/collections.ts
git commit -m "feat: instrument reading progress and collections with activity logging"
```

---

## Batch 3: Activity Server Actions + Dashboard Widget

### Task 6: Create activity server actions

**Files:**
- Create: `src/actions/activity.ts`

**Step 1:** Create the server actions file:

```typescript
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
    // Map filter categories to event types
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
    .limit(PAGE_SIZE + 1) // fetch one extra to check hasMore
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
```

**Step 2:** Verify build:

```bash
npm run build
```

**Step 3:** Commit:

```bash
git add src/actions/activity.ts
git commit -m "feat: add activity server actions (getRecentActivity, getActivityEvents)"
```

---

### Task 7: Create dashboard activity widget

**Files:**
- Create: `src/components/longbox/activity-event-row.tsx`
- Create: `src/components/longbox/recent-activity.tsx`

**Step 1:** Create the event row component. This renders a single activity event with an icon, message, and relative timestamp:

```typescript
import {
  ScanLine,
  Link,
  AlertTriangle,
  BookOpen,
  FolderOpen,
  Layers,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityEventRowProps {
  type: string;
  message: string;
  severity: string;
  createdAt: Date | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  scan_started: ScanLine,
  scan_complete: ScanLine,
  series_linked: Link,
  error: AlertTriangle,
  triage_approved: FolderOpen,
  triage_rejected: FolderOpen,
  book_completed: BookOpen,
  collection_created: Layers,
  collection_deleted: Layers,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'text-primary/70',
  warning: 'text-yellow-500/70',
  error: 'text-red-500/70',
};

export function ActivityEventRow({ type, message, severity, createdAt }: ActivityEventRowProps) {
  const Icon = ICON_MAP[type] ?? Activity;
  const iconColor = SEVERITY_COLORS[severity] ?? 'text-primary/70';
  const timeAgo = createdAt
    ? formatDistanceToNow(createdAt, { addSuffix: true })
    : '';

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/80 leading-snug truncate">{message}</p>
        {timeAgo && (
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 2:** Create the recent activity dashboard widget:

```typescript
import { unstable_noStore as noStore } from 'next/cache';
import { ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { getRecentActivity } from '@/actions/activity';
import { ActivityEventRow } from './activity-event-row';
import { EmptyState } from './empty-state';

export async function RecentActivity() {
  noStore();

  const events = await getRecentActivity(5);

  if (events.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </h2>
        <EmptyState
          icon="Activity"
          title="No activity yet"
          description="Run a scan to get started."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </h2>
        <Link
          href="/activity"
          className="text-xs text-primary hover:underline flex items-center"
        >
          View All <ArrowRight className="w-3 h-3 ml-1" />
        </Link>
      </div>
      <div className="rounded border border-border bg-card p-4 space-y-1">
        {events.map((event) => (
          <ActivityEventRow
            key={event.id}
            type={event.type}
            message={event.message}
            severity={event.severity}
            createdAt={event.createdAt}
          />
        ))}
      </div>
    </section>
  );
}
```

**Step 3:** Verify build:

```bash
npm run build
```

**Step 4:** Commit:

```bash
git add src/components/longbox/activity-event-row.tsx src/components/longbox/recent-activity.tsx
git commit -m "feat: add RecentActivity dashboard widget and ActivityEventRow component"
```

---

### Task 8: Add RecentActivity to dashboard + sidebar links

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/components/longbox/sidebar.tsx`
- Modify: `src/components/longbox/mobile-sidebar.tsx`

**Step 1:** In `page.tsx`, add import after line 9:

```typescript
import { RecentActivity } from '@/components/longbox/recent-activity';
```

**Step 2:** In `page.tsx`, add the RecentActivity section after StatsOverview (after line 47 `<StatsOverview />`) and before the two-column grid:

```tsx
      {/* Recent Activity */}
      <Suspense fallback={<div className="h-48 bg-muted rounded animate-pulse" />}>
        <RecentActivity />
      </Suspense>
```

**Step 3:** In `sidebar.tsx`, add `Activity` and `BarChart3` to the lucide-react import (line 6-16):

```typescript
import {
  LayoutGrid,
  Compass,
  DownloadCloud,
  Settings,
  Library,
  BookOpen,
  Users,
  Layers,
  AlertTriangle,
  Activity,
  BarChart3,
} from 'lucide-react';
```

**Step 4:** In `sidebar.tsx`, add two route entries after the Triage entry (after line 75, before the Management entry at line 76):

```typescript
  {
    label: 'Activity',
    icon: Activity,
    href: '/activity',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Analysis',
    icon: BarChart3,
    href: '/analysis',
    matchExact: false,
    disabled: false
  },
```

**Step 5:** In `mobile-sidebar.tsx`, add the same `Activity` and `BarChart3` imports and route entries in the same position (after Triage, before Management).

**Step 6:** Verify build:

```bash
npm run build
```

**Step 7:** Commit:

```bash
git add src/app/\(dashboard\)/page.tsx src/components/longbox/sidebar.tsx src/components/longbox/mobile-sidebar.tsx
git commit -m "feat: add RecentActivity to dashboard and Activity/Analysis sidebar links"
```

---

## Batch 4: Activity Page

### Task 9: Create `/activity` page

**Files:**
- Create: `src/app/(dashboard)/activity/page.tsx`
- Create: `src/app/(dashboard)/activity/loading.tsx`

**Step 1:** Create the loading skeleton:

```typescript
export default function ActivityLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Hero header skeleton */}
      <div className="h-32 bg-muted rounded animate-pulse" />

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      </div>

      {/* Event list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

**Step 2:** Create the activity page. This is a client component because it needs interactive filters and "Load more" pagination:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { getActivityEvents, type ActivityEvent } from '@/actions/activity';
import { ActivityEventRow } from '@/components/longbox/activity-event-row';
import { EmptyState } from '@/components/longbox/empty-state';
import { HeroHeader } from '@/components/longbox/hero-header';

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'scans', label: 'Scans' },
  { value: 'matches', label: 'Matches' },
  { value: 'triage', label: 'Triage' },
  { value: 'reading', label: 'Reading' },
  { value: 'errors', label: 'Errors' },
];

const SEVERITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

function groupByDate(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const event of events) {
    if (!event.createdAt) continue;

    const eventDate = new Date(event.createdAt);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    let label: string;
    if (eventDay.getTime() === today.getTime()) {
      label = 'Today';
    } else if (eventDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = eventDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    const existing = groups.get(label);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(label, [event]);
    }
  }

  return groups;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    const result = await getActivityEvents({
      type: typeFilter,
      severity: severityFilter,
      page: pageNum,
    });
    setEvents(prev => append ? [...prev, ...result.events] : result.events);
    setHasMore(result.hasMore);
    setLoading(false);
  }, [typeFilter, severityFilter]);

  useEffect(() => {
    setPage(1);
    fetchEvents(1, false);
  }, [fetchEvents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const grouped = groupByDate(events);

  return (
    <>
      <HeroHeader title="Activity" icon="Activity" />
      <main className="p-6 md:p-8 space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded border border-border bg-card text-sm text-foreground"
          >
            {TYPE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 px-3 rounded border border-border bg-card text-sm text-foreground"
          >
            {SEVERITY_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Event list grouped by date */}
        {events.length === 0 && !loading ? (
          <EmptyState
            icon="Activity"
            title="No activity recorded yet"
            description="Events will appear here as you use Longbox."
          />
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {dateLabel}
                </h3>
                <div className="rounded border border-border bg-card p-4 space-y-1">
                  {dateEvents.map((event) => (
                    <ActivityEventRow
                      key={event.id}
                      type={event.type}
                      message={event.message}
                      severity={event.severity}
                      createdAt={event.createdAt}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 text-sm rounded border border-border bg-card hover:bg-accent/50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
```

**Step 3:** Verify build:

```bash
npm run build
```

**Step 4:** Commit:

```bash
git add src/app/\(dashboard\)/activity/
git commit -m "feat: add /activity page with filters and date grouping"
```

---

## Batch 5: Analysis Server Actions

### Task 10: Create analysis server actions

**Files:**
- Create: `src/actions/analysis.ts`

**Step 1:** Create the analysis server actions. This file contains all data-fetching for the analysis page, broken into four independent functions:

```typescript
'use server';

import { db } from '@/db';
import { books, series, read_progress, issues } from '@/db/schema';
import { sql, eq, count, sum, desc, and, isNotNull, gte } from 'drizzle-orm';

// =====================
// Library Composition
// =====================

export interface LibraryComposition {
  totalSeries: number;
  totalBooks: number;
  totalFileSize: number; // bytes
  avgPageCount: number;
  publisherBreakdown: { name: string; count: number }[];
  decadeBreakdown: { decade: string; count: number }[];
}

export async function getLibraryComposition(): Promise<LibraryComposition> {
  const [totals, publishers, decades] = await Promise.all([
    // Totals
    db.select({
      totalSeries: sql<number>`count(distinct ${series.id})`,
      totalBooks: sql<number>`count(${books.id})`,
      totalFileSize: sql<number>`coalesce(sum(${books.file_size}), 0)`,
      avgPageCount: sql<number>`coalesce(round(avg(${books.page_count})), 0)`,
    }).from(books),

    // Publisher breakdown (top 10)
    db.select({
      name: sql<string>`coalesce(${books.publisher}, 'Unknown')`,
      count: sql<number>`count(*)`,
    })
      .from(books)
      .groupBy(books.publisher)
      .orderBy(desc(sql`count(*)`))
      .limit(11), // 11 to bucket "Other"

    // Decade breakdown
    db.select({
      decade: sql<string>`concat(floor(extract(year from ${books.published_date}) / 10) * 10, 's')`,
      count: sql<number>`count(*)`,
    })
      .from(books)
      .where(isNotNull(books.published_date))
      .groupBy(sql`floor(extract(year from ${books.published_date}) / 10) * 10`)
      .orderBy(sql`floor(extract(year from ${books.published_date}) / 10) * 10`),
  ]);

  // Bucket publishers beyond top 10 into "Other"
  let publisherBreakdown = publishers.map(p => ({
    name: p.name,
    count: Number(p.count),
  }));

  if (publisherBreakdown.length > 10) {
    const top10 = publisherBreakdown.slice(0, 10);
    const otherCount = publisherBreakdown.slice(10).reduce((sum, p) => sum + p.count, 0);
    publisherBreakdown = [...top10, { name: 'Other', count: otherCount }];
  }

  return {
    totalSeries: Number(totals[0]?.totalSeries ?? 0),
    totalBooks: Number(totals[0]?.totalBooks ?? 0),
    totalFileSize: Number(totals[0]?.totalFileSize ?? 0),
    avgPageCount: Number(totals[0]?.avgPageCount ?? 0),
    publisherBreakdown,
    decadeBreakdown: decades
      .filter(d => d.decade && !d.decade.startsWith('NaN'))
      .map(d => ({ decade: d.decade, count: Number(d.count) })),
  };
}

// =====================
// Metadata Health
// =====================

export interface MetadataHealth {
  totalSeries: number;
  seriesWithCvId: number;
  totalBooks: number;
  booksWithCredits: number;
  booksWithCovers: number; // approximate: books with page_count > 0 as proxy
  booksFlagged: number;
}

export async function getMetadataHealth(): Promise<MetadataHealth> {
  const [seriesStats, bookStats] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      withCvId: sql<number>`count(${series.cv_id})`,
    }).from(series),

    db.select({
      total: sql<number>`count(*)`,
      withCredits: sql<number>`count(${books.credits})`,
      withPages: sql<number>`sum(case when ${books.page_count} > 0 then 1 else 0 end)`,
      flagged: sql<number>`sum(case when ${books.match_flags} is not null and array_length(${books.match_flags}, 1) > 0 then 1 else 0 end)`,
    }).from(books),
  ]);

  return {
    totalSeries: Number(seriesStats[0]?.total ?? 0),
    seriesWithCvId: Number(seriesStats[0]?.withCvId ?? 0),
    totalBooks: Number(bookStats[0]?.total ?? 0),
    booksWithCredits: Number(bookStats[0]?.withCredits ?? 0),
    booksWithCovers: Number(bookStats[0]?.withPages ?? 0),
    booksFlagged: Number(bookStats[0]?.flagged ?? 0),
  };
}

// =====================
// Series Completion
// =====================

export interface SeriesCompletionStats {
  complete: number;   // 100%
  almostComplete: number; // >75%
  inProgress: number; // <75%
  topAlmostComplete: {
    id: string;
    name: string;
    ownedCount: number;
    totalIssues: number;
    percentage: number;
  }[];
}

export async function getSeriesCompletion(): Promise<SeriesCompletionStats> {
  // Get series with their owned book counts and known issue counts
  const seriesData = await db
    .select({
      id: series.id,
      name: series.name,
      ownedCount: sql<number>`count(${books.id})`,
    })
    .from(series)
    .innerJoin(books, eq(books.series_id, series.id))
    .groupBy(series.id, series.name);

  // Get issue counts from the issues table (ComicVine enriched data)
  const issueCounts = await db
    .select({
      seriesId: issues.series_id,
      totalIssues: sql<number>`count(*)`,
    })
    .from(issues)
    .groupBy(issues.series_id);

  const issueCountMap = new Map(issueCounts.map(ic => [ic.seriesId, Number(ic.totalIssues)]));

  let complete = 0;
  let almostComplete = 0;
  let inProgress = 0;
  const almostCompleteList: SeriesCompletionStats['topAlmostComplete'] = [];

  for (const s of seriesData) {
    const totalIssues = issueCountMap.get(s.id);
    if (!totalIssues || totalIssues === 0) continue; // Skip series without known issue counts

    const owned = Number(s.ownedCount);
    const pct = Math.round((owned / totalIssues) * 100);

    if (pct >= 100) {
      complete++;
    } else if (pct > 75) {
      almostComplete++;
      almostCompleteList.push({
        id: s.id,
        name: s.name,
        ownedCount: owned,
        totalIssues,
        percentage: pct,
      });
    } else {
      inProgress++;
    }
  }

  // Sort by percentage descending, take top 10
  almostCompleteList.sort((a, b) => b.percentage - a.percentage);

  return {
    complete,
    almostComplete,
    inProgress,
    topAlmostComplete: almostCompleteList.slice(0, 10),
  };
}

// =====================
// Reading Stats
// =====================

export interface ReadingStats {
  totalCompleted: number;
  totalInProgress: number;
  totalPagesRead: number;
  weeklyPace: { week: string; count: number }[]; // last 12 weeks
  currentStreak: number; // consecutive days with reading activity
}

export async function getReadingStats(): Promise<ReadingStats> {
  const [counts, weekly, streakData] = await Promise.all([
    // Basic counts
    db.select({
      completed: sql<number>`sum(case when ${read_progress.is_completed} = true then 1 else 0 end)`,
      inProgress: sql<number>`sum(case when ${read_progress.is_completed} = false then 1 else 0 end)`,
      pagesRead: sql<number>`coalesce(sum(${read_progress.page}), 0)`,
    }).from(read_progress),

    // Weekly pace (last 12 weeks)
    db.select({
      week: sql<string>`to_char(date_trunc('week', ${read_progress.updated_at}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`,
    })
      .from(read_progress)
      .where(
        and(
          eq(read_progress.is_completed, true),
          gte(read_progress.updated_at, sql`now() - interval '12 weeks'`)
        )
      )
      .groupBy(sql`date_trunc('week', ${read_progress.updated_at})`)
      .orderBy(sql`date_trunc('week', ${read_progress.updated_at})`),

    // Reading activity days for streak calculation
    db.select({
      day: sql<string>`to_char(${read_progress.updated_at}::date, 'YYYY-MM-DD')`,
    })
      .from(read_progress)
      .where(gte(read_progress.updated_at, sql`now() - interval '90 days'`))
      .groupBy(sql`${read_progress.updated_at}::date`)
      .orderBy(desc(sql`${read_progress.updated_at}::date`)),
  ]);

  // Calculate streak: count consecutive days from today backward
  let currentStreak = 0;
  if (streakData.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < streakData.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedStr = expectedDate.toISOString().split('T')[0];

      if (streakData[i].day === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    totalCompleted: Number(counts[0]?.completed ?? 0),
    totalInProgress: Number(counts[0]?.inProgress ?? 0),
    totalPagesRead: Number(counts[0]?.pagesRead ?? 0),
    weeklyPace: weekly.map(w => ({
      week: w.week,
      count: Number(w.count),
    })),
    currentStreak,
  };
}
```

**Step 2:** Verify build:

```bash
npm run build
```

**Step 3:** Commit:

```bash
git add src/actions/analysis.ts
git commit -m "feat: add analysis server actions (composition, health, completion, reading)"
```

---

## Batch 6: Analysis Page UI

### Task 11: Install Recharts

**Step 1:** Install recharts:

```bash
npm install recharts
```

**Step 2:** Verify build:

```bash
npm run build
```

**Step 3:** Commit:

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency"
```

---

### Task 12: Create reusable analysis components

**Files:**
- Create: `src/components/longbox/stat-progress-bar.tsx`
- Create: `src/components/longbox/reading-sparkline.tsx`

**Step 1:** Create the progress bar component for metadata health:

```typescript
import { Progress } from '@/components/ui/progress';

interface StatProgressBarProps {
  label: string;
  current: number;
  total: number;
  href?: string;
}

export function StatProgressBar({ label, current, total, href }: StatProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const content = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/80">{label}</span>
        <span className="text-sm font-medium">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:bg-accent/30 rounded p-2 -m-2 transition-colors">
        {content}
      </a>
    );
  }

  return content;
}
```

**Step 2:** Create the reading sparkline component. This is a client component wrapping Recharts:

```typescript
'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface ReadingSparklineProps {
  data: { week: string; count: number }[];
}

export function ReadingSparkline({ data }: ReadingSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgba(160,180,145,0.5)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="rgba(160,180,145,0.5)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" hide />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0d1410',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            formatter={(value: number) => [`${value} books`, 'Completed']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="rgba(160,180,145,0.5)"
            fill="url(#sparkGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 3:** Check that `src/components/ui/progress.tsx` exists (it should since `@radix-ui/react-progress` is installed). If not, generate it:

```bash
npx shadcn@latest add progress
```

**Step 4:** Verify build:

```bash
npm run build
```

**Step 5:** Commit:

```bash
git add src/components/longbox/stat-progress-bar.tsx src/components/longbox/reading-sparkline.tsx
git commit -m "feat: add StatProgressBar and ReadingSparkline components"
```

---

### Task 13: Create publisher bar chart component

**Files:**
- Create: `src/components/longbox/publisher-chart.tsx`

**Step 1:** Create the publisher horizontal bar chart component:

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface PublisherChartProps {
  data: { name: string; count: number }[];
}

export function PublisherChart({ data }: PublisherChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="w-full" style={{ height: `${Math.max(data.length * 36, 120)}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: '#c0c8b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0d1410',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value} issues`, 'Count']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={idx === data.length - 1 && data[idx].name === 'Other'
                  ? 'rgba(160,180,145,0.2)'
                  : 'rgba(160,180,145,0.4)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2:** Verify build:

```bash
npm run build
```

**Step 3:** Commit:

```bash
git add src/components/longbox/publisher-chart.tsx
git commit -m "feat: add PublisherChart horizontal bar chart component"
```

---

### Task 14: Create `/analysis` page

**Files:**
- Create: `src/app/(dashboard)/analysis/page.tsx`
- Create: `src/app/(dashboard)/analysis/loading.tsx`

**Step 1:** Create the loading skeleton:

```typescript
export default function AnalysisLoading() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Hero header skeleton */}
      <div className="h-32 bg-muted rounded animate-pulse" />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-64 bg-muted rounded animate-pulse" />

      {/* Progress bars skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

**Step 2:** Create the analysis page. This uses server components with Suspense for each section. Each section is a separate async component that fetches its own data:

```typescript
import { Suspense } from 'react';
import {
  Library,
  BookOpen,
  HardDrive,
  FileText,
  CheckCircle2,
  CircleDashed,
  TrendingUp,
  Flame,
  BarChart3,
} from 'lucide-react';
import { HeroHeader } from '@/components/longbox/hero-header';
import {
  getLibraryComposition,
  getMetadataHealth,
  getSeriesCompletion,
  getReadingStats,
} from '@/actions/analysis';
import { StatProgressBar } from '@/components/longbox/stat-progress-bar';
import { ReadingSparkline } from '@/components/longbox/reading-sparkline';
import { PublisherChart } from '@/components/longbox/publisher-chart';

export const dynamic = 'force-dynamic';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function SectionSkeleton() {
  return <div className="h-48 bg-muted rounded animate-pulse" />;
}

// --- Section Components ---

async function CompositionSection() {
  const data = await getLibraryComposition();

  const statCards = [
    { label: 'Series', value: data.totalSeries.toLocaleString(), icon: Library },
    { label: 'Issues', value: data.totalBooks.toLocaleString(), icon: BookOpen },
    { label: 'Total Size', value: formatBytes(data.totalFileSize), icon: HardDrive },
    { label: 'Avg Pages', value: String(data.avgPageCount), icon: FileText },
  ];

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Library className="w-5 h-5 text-primary" />
        Library Composition
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5 text-primary/70" />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Publisher breakdown */}
      {data.publisherBreakdown.length > 0 && (
        <div className="rounded border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Publishers (by issue count)</h3>
          <PublisherChart data={data.publisherBreakdown} />
        </div>
      )}

      {/* Decade breakdown */}
      {data.decadeBreakdown.length > 0 && (
        <div className="rounded border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Issues by Decade</h3>
          <PublisherChart data={data.decadeBreakdown.map(d => ({ name: d.decade, count: d.count }))} />
        </div>
      )}
    </section>
  );
}

async function HealthSection() {
  const data = await getMetadataHealth();

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        Metadata Health
      </h2>

      <div className="rounded border border-border bg-card p-4 space-y-4">
        <StatProgressBar
          label="ComicVine Linked"
          current={data.seriesWithCvId}
          total={data.totalSeries}
        />
        <StatProgressBar
          label="Has Credits"
          current={data.booksWithCredits}
          total={data.totalBooks}
        />
        <StatProgressBar
          label="Has Cover Data"
          current={data.booksWithCovers}
          total={data.totalBooks}
        />
      </div>

      {data.booksFlagged > 0 && (
        <p className="text-sm text-muted-foreground">
          {data.booksFlagged} book{data.booksFlagged !== 1 ? 's' : ''} flagged for review
        </p>
      )}
    </section>
  );
}

async function CompletionSection() {
  const data = await getSeriesCompletion();
  const hasData = data.complete + data.almostComplete + data.inProgress > 0;

  const statCards = [
    { label: 'Complete', value: data.complete, icon: CheckCircle2, color: 'text-green-500/70' },
    { label: 'Almost', value: data.almostComplete, icon: TrendingUp, color: 'text-yellow-500/70' },
    { label: 'In Progress', value: data.inProgress, icon: CircleDashed, color: 'text-primary/50' },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <CircleDashed className="w-5 h-5 text-primary" />
        Series Completion
      </h2>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">No series with known issue counts yet. Link series to ComicVine for completion tracking.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="rounded border border-border bg-card p-4 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <span className="text-2xl font-bold block">{stat.value}</span>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {data.topAlmostComplete.length > 0 && (
            <div className="rounded border border-border bg-card overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-medium text-muted-foreground">Almost Complete</h3>
              </div>
              <div className="divide-y divide-border">
                {data.topAlmostComplete.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="truncate flex-1">{s.name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {s.ownedCount}/{s.totalIssues} ({s.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

async function ReadingSection() {
  const data = await getReadingStats();
  const hasData = data.totalCompleted + data.totalInProgress > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Reading Stats
      </h2>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">Start reading to see your stats here.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary/70" />
                <span className="text-2xl font-bold">{data.totalCompleted}</span>
              </div>
              <p className="text-xs text-muted-foreground">Books Read</p>
            </div>
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-5 h-5 text-primary/50" />
                <span className="text-2xl font-bold">{data.totalInProgress}</span>
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-primary/50" />
                <span className="text-2xl font-bold">{data.totalPagesRead.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Pages Read</p>
            </div>
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-5 h-5 text-orange-500/70" />
                <span className="text-2xl font-bold">{data.currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>

          {/* Reading pace sparkline */}
          {data.weeklyPace.length > 1 && (
            <div className="rounded border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Books Completed per Week (12 weeks)</h3>
              <ReadingSparkline data={data.weeklyPace} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

// --- Main Page ---

export default function AnalysisPage() {
  return (
    <>
      <HeroHeader title="Analysis" icon="BarChart3" />
      <main className="p-6 md:p-8 space-y-10">
        <Suspense fallback={<SectionSkeleton />}>
          <CompositionSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <HealthSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CompletionSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <ReadingSection />
        </Suspense>
      </main>
    </>
  );
}
```

**Step 3:** Verify build:

```bash
npm run build
```

**Step 4:** Commit:

```bash
git add src/app/\(dashboard\)/analysis/
git commit -m "feat: add /analysis page with composition, health, completion, and reading stats"
```

---

## Batch 7: Verification + CLAUDE.md Update

### Task 15: Full build verification and cleanup

**Step 1:** Run full build:

```bash
npm run build
```

**Step 2:** Run lint:

```bash
npm run lint
```

Fix any lint errors.

**Step 3:** Verify all new routes load. Check for TypeScript errors, missing imports, or broken references by reviewing the build output.

**Step 4:** Commit any fixes:

```bash
git add -A
git commit -m "fix: address lint and build issues"
```

---

### Task 16: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1:** In the "Project Structure > Existing" section, add:

```
- `src/lib/activity-logger.ts` - Activity event logger (logEvent helper)
- `src/actions/activity.ts` - Activity feed server actions
- `src/actions/analysis.ts` - Library analytics server actions
- `src/app/(dashboard)/activity/` - Activity feed page (filters, date grouping)
- `src/app/(dashboard)/analysis/` - Library analytics page (4 sections)
- `src/components/longbox/recent-activity.tsx` - Dashboard activity widget
- `src/components/longbox/activity-event-row.tsx` - Activity event row component
- `src/components/longbox/stat-progress-bar.tsx` - Reusable progress bar for analytics
- `src/components/longbox/reading-sparkline.tsx` - Recharts reading pace sparkline
- `src/components/longbox/publisher-chart.tsx` - Recharts horizontal bar chart
```

**Step 2:** In the "Feature Roadmap" section, update Phase 3 status from `🔨` to `✅`:

```
### ✅ Phase 3: Activity & Analysis
- [x] Activity events table + logEvent() helper
- [x] Instrumented: scanner, triage, reading progress, collections
- [x] Dashboard activity widget (last 5 events)
- [x] Dedicated /activity page (filters by type/severity, date grouping, pagination)
- [x] Analysis page: library composition (publisher/decade bar charts, stat cards)
- [x] Analysis: metadata health with progress bars (ComicVine, credits, covers)
- [x] Analysis: series completion tracking (complete/almost/in-progress, top 10 table)
- [x] Analysis: reading stats (books read, pages, streaks, weekly sparkline)
- [x] Sidebar links for Activity and Analysis
```

**Step 3:** In the "Tech Stack" line, add `Recharts` after `Lucide icons`.

**Step 4:** Add an "Activity Logging" section under "Architecture Patterns":

```
### Activity Logging — Built
Events recorded via `logEvent()` from `src/lib/activity-logger.ts`. Fire-and-forget pattern — never throws, logs to console on failure. Instrumented at: scanner lifecycle, triage approve/reject, book completion, collection CRUD. Events stored in `activity_events` table with type, message, metadata (jsonb), severity, created_at. Dashboard widget shows last 5 events. /activity page supports type and severity filters with date grouping.
```

**Step 5:** Remove Phase 3 items from the "Planned (new paths)" section since they now exist.

**Step 6:** Commit:

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Phase 3 completion"
```
