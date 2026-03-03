# Phase 2: Scanner Intelligence & Series Linking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken dual-queue scanner with a signal-layered matching pipeline that auto-links files to series with confidence scoring, backed by a unified triage UI.

**Architecture:** Each file passes through signal extractors (ComicInfo.xml, folder name, filename), then series resolution (local DB + ComicVine), then confidence scoring (0-100). High confidence files auto-link, medium auto-link with flags, low go to a triage queue. A `scan_jobs` table persists scan state. The old file-based queue and split Review/Matching UI are replaced.

**Tech Stack:** Next.js 16.1 (App Router), Drizzle ORM, PostgreSQL, React 19, Tailwind CSS, shadcn/ui, Lucide icons

**IMPORTANT:** Next.js 16.1 gotcha: `revalidateTag()` requires 2 args. Use `updateTag()` from `next/cache` instead (single arg).

---

## Batch 1: Schema Changes

All tasks in this batch are independent and can run in parallel.

### Task 1: Add `scan_jobs` table

**Files:**
- Modify: `src/db/schema.ts`

**Step 1:** Add the `scan_jobs` table definition after the `appSettings` table (around line 219), before the `books` table.

```typescript
// Scan Jobs table - Persists scan state across restarts
export const scanJobs = pgTable('scan_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: text('status').notNull().default('idle'), // idle | running | completed | failed
  started_at: timestamp('started_at').defaultNow(),
  completed_at: timestamp('completed_at'),
  total_files: integer('total_files').default(0),
  processed_files: integer('processed_files').default(0),
  matched: integer('matched').default(0),
  needs_review: integer('needs_review').default(0),
  errors: integer('errors').default(0),
  current_file: text('current_file'),
});
```

**Step 2:** Commit.

```
git commit -m "feat: add scan_jobs table to schema"
```

---

### Task 2: Rename `importQueue` to `triageQueue` with new columns

**Files:**
- Modify: `src/db/schema.ts`

**Step 1:** Replace the `importQueue` table definition (lines 266-280) with the new `triageQueue`:

```typescript
// Triage Queue table - Files awaiting manual series assignment
export const triageQueue = pgTable('triage_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  file_path: text('file_path').notNull().unique(),
  file_size: integer('file_size').notNull(),

  // Scanner suggestions
  suggested_series: text('suggested_series'),
  suggested_title: text('suggested_title'),
  suggested_number: text('suggested_number'),

  // Pipeline results
  match_confidence: real('match_confidence').default(0),
  matched_series_id: uuid('matched_series_id').references(() => series.id, { onDelete: 'set null' }),
  signals: jsonb('signals'), // {comicinfo: {...}, folder: {...}, filename: {...}}
  status: text('status').notNull().default('pending'), // pending | approved | rejected

  // Tracking
  scan_job_id: uuid('scan_job_id').references(() => scanJobs.id, { onDelete: 'set null' }),
  metadata_xml: text('metadata_xml'),
  created_at: timestamp('created_at').defaultNow(),
});
```

**Step 2:** Update ALL references to `importQueue` across the codebase. It appears in:
- `src/db/schema.ts` (the definition itself)
- `src/lib/scanner/scan-manager.ts` (imports + inserts)
- `src/app/api/review/queue/route.ts` (query)

For `scan-manager.ts`, update the import from `importQueue` to `triageQueue` and update the insert call to include `status: 'pending'`.

For `src/app/api/review/queue/route.ts`, change `importQueue` import to `triageQueue` and update the query.

**Step 3:** Commit.

```
git commit -m "feat: rename importQueue to triageQueue with pipeline columns"
```

---

### Task 3: Add `match_flags` to `books` table

**Files:**
- Modify: `src/db/schema.ts`

**Step 1:** Add `match_flags` column to the `books` table (after `story_arcs`, around line 248):

```typescript
  // Match tracking
  match_flags: text('match_flags').array(), // ["low_confidence", "needs_metadata"]
```

**Step 2:** Commit.

```
git commit -m "feat: add match_flags column to books table"
```

---

### Task 4: Drop `seriesMatchCandidates` table

**Files:**
- Modify: `src/db/schema.ts`

**Step 1:** Remove the `seriesMatchCandidates` table definition (lines 144-153) and its relations block `seriesMatchCandidatesRelations` (lines 183-188).

**Step 2:** Remove `matchCandidates: many(seriesMatchCandidates)` from `seriesRelations` (line 173).

**Step 3:** Commit.

```
git commit -m "refactor: drop unused seriesMatchCandidates table"
```

---

### Task 5: Push schema changes to database

**Step 1:** Run drizzle-kit push:

```
npx drizzle-kit push
```

This will create `scan_jobs`, drop `import_queue` and create `triage_queue`, add `match_flags` to `books`, and drop `series_match_candidates`.

**Step 2:** Verify the build still compiles:

```
npm run build
```

Fix any remaining references to `importQueue` or `seriesMatchCandidates` that cause build errors.

**Step 3:** Commit any fixes.

```
git commit -m "chore: push schema changes to database"
```

---

## Batch 2: Scanner Pipeline Core

Tasks 6-9 are sequential (each depends on the previous).

### Task 6: Create filename parser

**Files:**
- Create: `src/lib/scanner/filename-parser.ts`

**Step 1:** Create the file with robust series name + issue number extraction. This replaces the inline `extractIssueNumberFromFilename` in `scan-manager.ts` and adds series name extraction.

Key exports:
- `normalizeSeriesName(name: string): string` - Lowercase, remove punctuation except hyphens, collapse whitespace
- `parseFilename(fileName: string): FilenameParseResult` - Returns `{ seriesName, issueNumber, year }`

The parser should handle these patterns:
- `"Batman (2016) 001 (2024).cbz"` -> series="Batman (2016)", number="001"
- `"Amazing Spider-Man #5.cbz"` -> series="Amazing Spider-Man", number="5"
- `"Saga 054 (2018) (Digital) (Zone-Empire).cbr"` -> series="Saga", number="054"
- `"Series Name v2 012.cbz"` -> series="Series Name", number="012"
- `"Series Name 03 (of 04).cbr"` -> series="Series Name", number="03"

Implementation approach:
1. Remove file extension
2. Extract and remove parenthetical tags (Digital, Zone-Empire, c2c, etc) but preserve year (YYYY) and (of N) patterns
3. Extract issue number using priority: "N (of M)" > "#N" > "vN NNN" > last standalone non-year number
4. Extract series name as everything before the issue number, trimming trailing "v"/"vol" prefixes

```typescript
export interface FilenameParseResult {
  seriesName: string | null;
  issueNumber: string | null;
  year: number | null;
}

export function normalizeSeriesName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseFilename(fileName: string): FilenameParseResult {
  // ... implementation as described above
}
```

**Step 2:** Commit.

```
git commit -m "feat: add robust filename parser for series name and issue extraction"
```

---

### Task 7: Create signal extractors

**Files:**
- Create: `src/lib/scanner/signals.ts`

**Step 1:** Define signal types and extraction functions.

Key types:
```typescript
export interface ComicInfoSignal {
  seriesName: string | null;
  issueNumber: string | null;
  title: string | null;
  publisher: string | null;
  year: number | null;
  writer: string | null;
  penciller: string | null;
  pageCount: number | null;
  summary: string | null;
}

export interface FolderSignal {
  folderName: string;
  normalizedName: string;
  depth: number;
}

export interface FilenameSignal {
  seriesName: string | null;
  normalizedName: string | null;
  issueNumber: string | null;
  year: number | null;
}

export interface ExtractedSignals {
  comicInfo: ComicInfoSignal | null;
  folder: FolderSignal;
  filename: FilenameSignal;
  filePath: string;
  fileSize: number;
}
```

Key exports:
- `extractComicInfoSignal(filePath)` - Uses `extractComicInfo()` from `@/lib/metadata/parser`
- `extractFolderSignal(filePath, libraryRoot)` - Parent directory name, normalized, depth
- `extractFilenameSignal(filePath)` - Uses `parseFilename()` from `./filename-parser`
- `extractAllSignals(filePath, fileSize, libraryRoot)` - Runs all three in parallel
- `deriveSeriesName(signals)` - Best canonical name: ComicInfo > Folder > Filename
- `deriveIssueNumber(signals)` - Best issue number: ComicInfo > Filename

**Step 2:** Commit.

```
git commit -m "feat: add signal extractors for ComicInfo, folder, and filename"
```

---

### Task 8: Create confidence scorer

**Files:**
- Create: `src/lib/scanner/confidence.ts`

**Step 1:** Implement confidence scoring based on signal agreement against a candidate series.

Scoring factors:
- ComicInfo series name matches candidate: +40
- Folder name matches candidate: +25
- Filename-parsed series matches candidate: +15
- Has publisher metadata: +5
- Has issue number metadata: +5
- Multiple signals agree on series name: +5
- Year signals agree: +5

Without a candidate series, cap score at 55 (internal signals only).

Key exports:
```typescript
export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ConfidenceResult {
  score: number; // 0-100
  tier: ConfidenceTier;
  reasons: string[];
}

export function scoreConfidence(
  signals: ExtractedSignals,
  candidateSeriesName: string | null
): ConfidenceResult {
  // ... implementation
}
```

Tier thresholds: high >= 90, medium >= 60, low < 60.

**Step 2:** Commit.

```
git commit -m "feat: add confidence scoring for series matching"
```

---

### Task 9: Create the matching pipeline

**Files:**
- Create: `src/lib/scanner/pipeline.ts`

**Step 1:** Build the core `processFile()` function that orchestrates the full pipeline.

```typescript
export interface ProcessResult {
  action: 'linked' | 'linked_flagged' | 'triaged' | 'skipped' | 'error';
  seriesId?: string;
  seriesName?: string;
  confidence?: number;
  error?: string;
}

export async function processFile(
  filePath: string,
  fileSize: number,
  libraryRoot: string,
  scanJobId?: string
): Promise<ProcessResult>
```

Pipeline flow:
1. Skip if already in `books` or `triageQueue`
2. Extract all signals via `extractAllSignals()`
3. Derive canonical series name via `deriveSeriesName()`
4. Resolve candidate series: exact match in DB, then case-insensitive (ilike)
5. Score confidence via `scoreConfidence()`
6. Route:
   - High + candidate: insert into `books` (no flags)
   - Medium + candidate: insert into `books` with `match_flags: ['low_confidence']`
   - Low: insert into `triageQueue`

The `resolveSeriesCandidate()` helper queries the `series` table:
- First: exact `eq(series.name, seriesName)`
- Then: `ilike(series.name, seriesName)`
- Returns `{ id, name, cvId }` or null

The `insertBook()` helper creates a book record using signal data (ComicInfo metadata for title, publisher, authors, etc).

The `insertTriage()` helper creates a triage queue record with signals jsonb, confidence, and optional matched_series_id.

**Step 2:** Commit.

```
git commit -m "feat: add matching pipeline with signal extraction, series resolution, and confidence routing"
```

---

## Batch 3: Unified Scanner & Watcher

Tasks 10-13 are sequential.

### Task 10: Create unified scanner

**Files:**
- Create: `src/lib/scanner/unified-scanner.ts`

**Step 1:** This replaces `scan-manager.ts`. It walks the library, creates a `scan_jobs` row, and feeds each file to the pipeline.

Key exports:
- `getLibraryPath()` - Reads from `AppSettings.get('library_path')`, falls back to `process.env.LIBRARY_PATH`, then `/comics`
- `runFullScan()` - Main entry point

Flow:
1. Get library path from `AppSettings`
2. Verify path is accessible
3. Collect all files recursively (`.cbz`, `.zip`, `.cbr`)
4. Create `scan_jobs` row (status: 'running')
5. Loop through files, calling `processFile()` from `./pipeline` for each
6. Emit progress via `scannerProgress` singleton (same as before)
7. Periodically update `scan_jobs` row (every 50 files)
8. On completion: update `scan_jobs` status to 'completed' with final counts
9. On error: update `scan_jobs` status to 'failed'

Returns `{ success, count, queued, time, jobId }`.

**Step 2:** Commit.

```
git commit -m "feat: add unified scanner with scan_jobs integration and pipeline routing"
```

---

### Task 11: Rewrite watcher to use pipeline

**Files:**
- Modify: `src/lib/scanner/watcher.ts`

**Step 1:** Rewrite `watcher.ts` to use `processFile()` from the pipeline instead of inline logic.

Key changes:
- Remove the inline `extractMetadata()` function and `handleAdd()` with yauzl logic
- New `handleAdd()` just calls `processFile()` from `./pipeline`
- Keep `handleRemove()` (deletes book by file_path)
- Keep `sync()` but update it to use `handleAdd()` (which now uses pipeline)
- Keep `initWatcher()` structure (chokidar setup, AppSettings for path)
- Remove unused imports (`yauzl`, `parseStringPromise`, `sql`)

**Step 2:** Commit.

```
git commit -m "refactor: rewrite watcher to use matching pipeline"
```

---

### Task 12: Update triggerScan server action

**Files:**
- Modify: `src/app/(dashboard)/settings/actions.ts`

**Step 1:** Change the import from `scan-manager` to `unified-scanner`:

```typescript
import { runFullScan } from '@/lib/scanner/unified-scanner';
```

**Step 2:** Update `triggerScan` to also revalidate `/triage`:

```typescript
export async function triggerScan() {
  const result = await runFullScan();
  revalidatePath('/');
  revalidatePath('/library');
  revalidatePath('/triage');
  return result;
}
```

**Step 3:** Commit.

```
git commit -m "refactor: update triggerScan to use unified scanner"
```

---

### Task 13: Create scanner status REST endpoint

**Files:**
- Create: `src/app/api/scanner/status/route.ts`

**Step 1:** REST endpoint that reads the latest `scan_jobs` row.

```typescript
import { db } from '@/db';
import { scanJobs } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const latest = await db.select()
    .from(scanJobs)
    .orderBy(desc(scanJobs.started_at))
    .limit(1);

  if (latest.length === 0) {
    return NextResponse.json({ status: 'idle', hasRun: false });
  }

  return NextResponse.json(latest[0]);
}
```

**Step 2:** Commit.

```
git commit -m "feat: add REST endpoint for scanner status polling"
```

---

## Batch 4: Triage Actions & Hook

Tasks 14-15 are independent and can run in parallel.

### Task 14: Create triage server actions

**Files:**
- Create: `src/actions/triage.ts`

**Step 1:** Server actions for triage operations. Mark as `'use server'`.

Key exports:
- `getTriageItems(): Promise<TriageGroup[]>` - Fetches all pending triage items from DB, grouped by parent folder. Each group has: folderName, folderPath, items array, suggestedSeriesId/Name, avgConfidence.
- `getTriageCounts()` - Returns `{ pending, high, medium, low }` counts for badges.
- `approveGroup(folderPath, seriesId)` - Approves all pending items in a folder. If seriesId is null, creates a new local series. Moves items from triage to books table, marks triage rows as 'approved'.
- `rejectGroup(folderPath)` - Marks all pending items in a folder as 'rejected'.
- `approveFile(itemId, seriesId)` - Approves a single file to a specific series.

The `getTriageItems` function:
1. Queries `triageQueue` joined with `series` (for matched_series_id name lookup)
2. Filters `status = 'pending'`
3. Groups results by parent folder path
4. Calculates avgConfidence and most common suggestedSeries per group
5. Sorts groups by item count descending

The `approveGroup` function:
1. Selects all pending items where `file_path LIKE folderPath/%`
2. If no seriesId provided, creates a new series from suggested_series name
3. For each item: inserts into `books` (using signals.comicinfo for metadata), marks triage row as 'approved'
4. Revalidates `/triage`, `/library`, `/`

**Step 2:** Commit.

```
git commit -m "feat: add triage server actions for approve, reject, and group operations"
```

---

### Task 15: Create `useScanStatus` hook

**Files:**
- Create: `src/hooks/use-scan-status.ts`

**Step 1:** Client-side hook that polls the REST endpoint.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useScanStatus(pollInterval = 3000) {
  // Fetches /api/scanner/status on mount
  // Polls every pollInterval ms when status is 'running'
  // Stops polling when status changes to completed/failed/idle
  // Returns { status, isScanning, refresh }
}
```

**Step 2:** Commit.

```
git commit -m "feat: add useScanStatus hook for polling scanner state"
```

---

## Batch 5: Triage UI & Navigation

Tasks 16-19 can be partially parallelized (16+17 together, then 18+19 together).

### Task 16: Create triage page

**Files:**
- Create: `src/app/(dashboard)/triage/page.tsx`

**Step 1:** Server component with `export const dynamic = 'force-dynamic'`.

Layout:
1. Header: "Triage" title + description
2. Stats chips row: pending count, high/medium/low confidence counts (using `getTriageCounts()`)
3. Grouped cards: one `TriageGroupCard` per folder group (using `getTriageItems()`)
4. Empty state: `EmptyState` component when no pending items ("All caught up")

Style the stats chips with the project's muted green palette:
- Pending: `bg-[rgba(160,180,145,0.15)]` with `text-[#c0c8b8]`
- High: `bg-primary/10` with `text-primary`
- Medium: `bg-yellow-500/10` with `text-yellow-500/70`
- Low: `bg-destructive/10` with `text-destructive/70`

Use `Clock`, `CheckCircle2`, `AlertTriangle` icons from lucide-react.

**Step 2:** Commit.

```
git commit -m "feat: add triage page with grouped file display and stats"
```

---

### Task 17: Create triage group card component

**Files:**
- Create: `src/components/longbox/triage-group-card.tsx`

**Step 1:** Client component (`'use client'`) for a single triage group.

Props: `{ group: TriageGroup }` (type from `@/actions/triage`)

Layout:
- Collapsed: folder icon + folder name + file count + suggested series name + confidence badge + Approve/Reject buttons
- Expanded: list of individual files with filename, suggested series, issue number, confidence score

State:
- `expanded` (boolean) - toggle with chevron button
- `loading` (boolean) - disable buttons during approve/reject

Actions:
- Approve: calls `approveGroup(group.folderPath, group.suggestedSeriesId)`, then `router.refresh()`
- Reject: calls `rejectGroup(group.folderPath)`, then `router.refresh()`

Confidence colors:
- >= 90: `text-primary` / `bg-primary/10`
- >= 60: `text-yellow-500/70` / `bg-yellow-500/10`
- < 60: `text-destructive/70` / `bg-destructive/10`

Icons: `ChevronDown`, `ChevronRight`, `FolderOpen`, `Check`, `X`, `FileText` from lucide-react.

**Step 2:** Commit.

```
git commit -m "feat: add triage group card with expand, approve, and reject"
```

---

### Task 18: Create triage loading skeleton

**Files:**
- Create: `src/app/(dashboard)/triage/loading.tsx`

**Step 1:** Skeleton matching the triage page layout: header placeholder, 3 stat chip placeholders, 4 group card placeholders. Use `bg-muted rounded animate-pulse`.

**Step 2:** Commit.

```
git commit -m "feat: add triage page loading skeleton"
```

---

### Task 19: Add triage link to sidebars

**Files:**
- Modify: `src/components/longbox/sidebar.tsx`
- Modify: `src/components/longbox/mobile-sidebar.tsx`

**Step 1:** In both sidebars, add a Triage route to the `ROUTES` array after the Collections entry:

```typescript
{
  label: 'Triage',
  icon: AlertTriangle,
  href: '/triage',
  matchExact: false,
  disabled: false
},
```

Add `AlertTriangle` to the lucide-react import in both files.

**Step 2:** Commit.

```
git commit -m "feat: add Triage nav link to both sidebars"
```

---

## Batch 6: Cleanup & Verification

Tasks 20-22 can be partially parallelized.

### Task 20: Remove Review Queue and Matching tabs from settings

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Step 1:** Remove the Review Queue and Matching tabs:
- Remove `TabsTrigger` for "review" and "matching"
- Remove `TabsContent` blocks for "review" and "matching"
- Remove imports: `ReviewQueueSection`, `UnmatchedSeriesSection`, `AlertTriangle`, `LinkIcon`
- Change `grid-cols-5` to `grid-cols-3` on the `TabsList`

**Step 2:** In the Scanner tab, add a card linking to `/triage`:

```tsx
<div className="group relative overflow-hidden rounded border border-border bg-card p-6">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-bold text-foreground">File Triage</h3>
      <p className="text-xs text-muted-foreground mt-1">
        Review and assign unmatched files to series
      </p>
    </div>
    <a
      href="/triage"
      className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded font-medium hover:bg-accent transition-colors text-sm"
    >
      Open Triage
    </a>
  </div>
</div>
```

**Step 3:** Commit.

```
git commit -m "refactor: remove Review Queue and Matching tabs from settings, add triage link"
```

---

### Task 21: Delete legacy files

**Files to delete:**
- `src/lib/scanner/scan-manager.ts` (replaced by `unified-scanner.ts`)
- `src/utils/queue.ts` (file-based queue, replaced by DB triage_queue)
- `config/import_queue.json` (file-based queue data)

**Step 1:** Delete the files.

**Step 2:** Search for any remaining imports of these files and fix them. Check for:
- `scan-manager` references in any .ts/.tsx file
- `utils/queue` references in any .ts/.tsx file

**Step 3:** Commit.

```
git commit -m "refactor: delete legacy scan-manager, file-based queue, and queue data"
```

---

### Task 22: Delete old API routes and unused components

**Files to delete:**
- `src/app/api/review/` (entire directory: route.ts, approve/, queue/, reject/, search/, select/)
- `src/app/api/import/` (entire directory: unmatched/)
- `src/components/longbox/review-queue-section.tsx`
- `src/components/longbox/unmatched-series-section.tsx`
- `src/components/longbox/import-matcher.tsx`

**Step 1:** Delete all the files/directories listed above.

**Step 2:** Search for any remaining references in client code:
- `/api/review` references
- `/api/import` references
- `review-queue-section` references
- `unmatched-series-section` references
- `import-matcher` references

Fix any found references.

**Step 3:** Commit.

```
git commit -m "refactor: delete old review/import API routes and related components"
```

---

### Task 23: Build verification

**Step 1:** Run the linter:

```
npm run lint
```

Fix any errors (warnings for `<img>` tags are acceptable, existing pattern).

**Step 2:** Run the production build:

```
npm run build
```

Fix any TypeScript or build errors.

**Step 3:** Verify schema is in sync:

```
npx drizzle-kit push
```

**Step 4:** Commit any fixes.

```
git commit -m "chore: fix lint and build errors from Phase 2 implementation"
```
