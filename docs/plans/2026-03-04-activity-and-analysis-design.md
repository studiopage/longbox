# Phase 3: Activity & Analysis — Design

## Overview

Add two features to Longbox: (1) an activity logging system that records events across the app, and (2) a library analytics page with composition, metadata health, series completion, and reading stats.

**Approach chosen:** Dedicated `activity_events` table with `logEvent()` helper instrumented at ~12 call sites. Analysis queries existing tables directly.

**Charting:** Recharts for bar charts and sparklines.

## 1. Schema — `activity_events` Table

```
activity_events
├── id           uuid PK (defaultRandom)
├── type         text NOT NULL
├── message      text NOT NULL
├── metadata     jsonb
├── severity     text NOT NULL DEFAULT 'info'
├── created_at   timestamp (defaultNow)
```

**Event types:** `scan_started`, `scan_complete`, `file_detected`, `metadata_fetched`, `series_linked`, `error`, `request_fulfilled`, `user_action`, `triage_approved`, `triage_rejected`, `book_completed`, `collection_created`, `collection_deleted`

**Severity levels:** `info`, `warning`, `error`

**Index:** `created_at DESC` for feed queries, optional index on `type`.

**Retention:** No auto-cleanup initially. Event volume is low (~50 per scan + occasional user events).

### logEvent() Helper

Located at `src/lib/activity-logger.ts`:

```typescript
type ActivityEventType =
  | 'scan_started' | 'scan_complete'
  | 'series_linked' | 'error'
  | 'triage_approved' | 'triage_rejected'
  | 'book_completed'
  | 'collection_created' | 'collection_deleted';

async function logEvent(
  type: ActivityEventType,
  message: string,
  metadata?: Record<string, unknown>,
  severity?: 'info' | 'warning' | 'error'
): Promise<void>
```

### Instrumentation Sites (~12)

| Location | Event Type | When |
|----------|-----------|------|
| `unified-scanner.ts` | `scan_started` | Scan begins |
| `unified-scanner.ts` | `scan_complete` | Scan finishes (metadata: total, matched, triaged, errors) |
| `pipeline.ts` | `series_linked` | High-confidence auto-link |
| `pipeline.ts` | `error` | Pipeline processing error |
| `triage.ts` | `triage_approved` | Group or file approved |
| `triage.ts` | `triage_rejected` | Group rejected |
| `reading-progress.ts` | `book_completed` | Book marked complete |
| `collections.ts` | `collection_created` | Collection created |
| `collections.ts` | `collection_deleted` | Collection deleted |

**Note:** `file_detected` is NOT logged per-file. The `scan_complete` event carries file counts in metadata to avoid flooding the feed.

## 2. Dashboard Activity Widget

Added after `StatsOverview` in the dashboard layout:

```
HomePage (updated)
├── PinnedCollectionsChips (mobile)
├── ContinueReading
├── FavoriteCharacters
├── StatsOverview (4 stat cards)
├── RecentActivity ← NEW
├── Two-column grid:
│   ├── NeedsAttention
│   └── GapReport
└── RecentlyAdded
```

**RecentActivity component:**
- Server component, queries latest 5 events
- Each row: icon (by type) + message + relative timestamp
- Icon mapping: ScanLine (scan), Link (series_linked), AlertTriangle (error), BookOpen (reading), FolderOpen (triage), Layers (collections)
- "View all" link to `/activity`
- Empty state: "No activity yet. Run a scan to get started."
- Suspense with skeleton loader

## 3. `/activity` Page

**Route:** `src/app/(dashboard)/activity/page.tsx`

- HeroHeader: "Activity" with `Activity` icon
- Filter bar: type dropdown (All / Scans / Matches / Triage / Reading / Errors) + severity dropdown (All / Info / Warning / Error)
- Event list: vertical timeline, grouped by date ("Today", "Yesterday", "March 2")
- Each event: icon + message + metadata chips + timestamp
- Pagination: "Load more" button, 25 per page
- Empty state: "No activity recorded yet."

**Server action:** `getActivityEvents(filters, page)` in `src/actions/activity.ts`

**Sidebar:** Add "Activity" link with `Activity` icon after Triage in both sidebars.

## 4. `/analysis` Page

**Route:** `src/app/(dashboard)/analysis/page.tsx`

HeroHeader "Analysis" with `BarChart3` icon. Four sections, each independently Suspense-wrapped:

### 4a. Library Composition

- **Stat cards row:** Total Series, Total Issues, Total File Size (formatted), Avg Issue Length (pages)
- **Publisher breakdown:** Recharts horizontal `BarChart`. Top 10 publishers by issue count, "Other" bucket. Numbers on each bar.
- **Year breakdown:** Horizontal bar chart. Issues by publication decade (1960s–2020s).
- **Format breakdown:** Stat cards for Issues vs TPBs vs Omnibuses.

### 4b. Metadata Health

- Three progress bars with percentages:
  - "ComicVine linked" — series with cv_id / total series
  - "Has credits" — books with non-null credits / total books
  - "Has cover" — books with cached covers / total books
- Stat: "X books flagged for review" (match_flags containing 'needs_metadata')
- Progress bars link to relevant smart collections

### 4c. Series Completion

- Three stat cards: Complete (100%), Almost complete (>75%), In Progress (<75%)
- Table: top 10 "almost complete" series — name, have/total issues, completion %, placeholder "Request Missing" button (Phase 4)
- Completion: compare owned books vs known issue count (series with ComicVine data)

### 4d. Reading Stats

- Stat cards: Books Read (total completed), In Progress, Pages Read (sum)
- **Reading pace sparkline:** Recharts `AreaChart` — books completed per week, last 12 weeks. Minimal. Only shown with reading data.
- **Streak stat:** "Current streak: X days" (consecutive days with reading progress updates)

**Data fetching:** Server actions in `src/actions/analysis.ts`, each section fetched independently via Suspense.

## 5. File Structure

### New Files
```
src/db/schema.ts                         ← add activityEvents table
src/lib/activity-logger.ts               ← logEvent() + types
src/actions/activity.ts                  ← getRecentActivity(), getActivityEvents()
src/actions/analysis.ts                  ← getLibraryComposition(), getMetadataHealth(),
                                            getSeriesCompletion(), getReadingStats()
src/app/(dashboard)/activity/page.tsx    ← activity feed page
src/app/(dashboard)/activity/loading.tsx ← skeleton
src/app/(dashboard)/analysis/page.tsx    ← analytics page
src/app/(dashboard)/analysis/loading.tsx ← skeleton
src/components/longbox/recent-activity.tsx    ← dashboard widget
src/components/longbox/activity-event-row.tsx ← single event row
src/components/longbox/stat-progress-bar.tsx  ← reusable progress bar
src/components/longbox/reading-sparkline.tsx  ← Recharts sparkline wrapper
```

### Modified Files
```
src/app/(dashboard)/page.tsx                 ← add RecentActivity section
src/components/longbox/sidebar.tsx           ← add Activity + Analysis nav links
src/components/longbox/mobile-sidebar.tsx    ← same
src/lib/scanner/unified-scanner.ts           ← logEvent for scan_started/complete
src/lib/scanner/pipeline.ts                  ← logEvent for series_linked, errors
src/actions/triage.ts                        ← logEvent for approve/reject
src/lib/data/reading-progress.ts             ← logEvent for book_completed
src/actions/collections.ts                   ← logEvent for collection CRUD
```

### Dependency
- `recharts` (npm install)
