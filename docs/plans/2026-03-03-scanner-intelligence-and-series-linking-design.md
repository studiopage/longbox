# Phase 2: Scanner Intelligence & Series Linking — Design

**Date:** 2026-03-03
**Status:** Approved

## Problem

Files import into Longbox but don't link to series properly. The scanner does exact string matching on series names — if no match, files either auto-create a stub series (watcher) or go to an import queue (full scan). No fuzzy matching, no confidence scoring, no ComicVine lookup during scan. Two separate queue systems (DB table + file-based JSON) are inconsistent and partially broken.

## Approach: Signal-Layered Pipeline

Each file passes through a pipeline that extracts signals from multiple sources, attempts series resolution, scores confidence, and routes accordingly.

## Section 1: Matching Pipeline

### Pipeline Flow

```
File → Extract Signals → Resolve Series → Score Confidence → Route
```

**Step 1 — Extract Signals** (per file, parallel where possible):

| Signal | Source | Extracts |
|--------|--------|----------|
| ComicInfo | ComicInfo.xml inside CBZ/CBR | series name, issue number, publisher, year, writer, title |
| Folder | Parent directory name | series name (normalized) |
| Filename | File name parsing | series name, issue number, year |

**Step 2 — Resolve Series:**
- Build a canonical series name from signals (ComicInfo > Folder > Filename priority)
- Search existing series table for matches (exact first, then normalized/fuzzy)
- If no local match and ComicVine API key is configured, search ComicVine
- Produce a `candidateSeries` (existing series row, CV result, or null)

**Step 3 — Score Confidence:**
- Each signal that agrees with the candidate adds to the score
- ComicInfo match with CV confirmation = highest confidence
- Folder-only match with no CV = lower confidence
- Score range: 0–100

**Step 4 — Route by confidence tier:**

| Tier | Score | Action |
|------|-------|--------|
| High | 90–100 | Auto-link to series silently |
| Medium | 60–89 | Auto-link but flag for review (`match_flags` on books row) |
| Low | < 60 | Send to triage queue for manual resolution |

## Section 2: Schema Changes

### New table: `scan_jobs`

Persists scan state so it survives server restarts and is queryable from any component.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `status` | text | `idle` / `running` / `completed` / `failed` |
| `started_at` | timestamp | |
| `completed_at` | timestamp | nullable |
| `total_files` | integer | 0 |
| `processed_files` | integer | 0 |
| `matched` | integer | auto-linked count |
| `needs_review` | integer | sent to triage |
| `errors` | integer | |
| `current_file` | text | file being processed now |

### Rename `import_queue` → `triage_queue` with new columns

| New Column | Type | Notes |
|------------|------|-------|
| `match_confidence` | real | 0–100 score |
| `matched_series_id` | uuid FK → series | nullable, pipeline's best guess |
| `signals` | jsonb | `{comicinfo: {...}, folder: {...}, filename: {...}}` — raw extracted signals |
| `status` | text | `pending` / `approved` / `rejected` |
| `scan_job_id` | uuid FK → scan_jobs | which scan found this file |

Existing columns retained: `file_path`, `file_size`, `suggested_series`, `suggested_title`, `suggested_number`, `metadata_xml`, `created_at`.

### Modify `books` table

- Add `match_flags` (text[], nullable) — flags like `"low_confidence"`, `"needs_metadata"` for auto-linked items that need attention.

### Drop `seriesMatchCandidates`

Unused scaffolding. The triage_queue replaces its purpose entirely.

### Consolidate library path

Single source of truth: `appSettings` table (key: `library_path`). Remove reliance on env vars (`LIBRARY_PATH`, `LIBRARY_ROOT`, `NEXT_PUBLIC_LIBRARY_PATH`) for library path in scanner code.

### Delete file-based queue

Remove `src/utils/queue.ts` and `config/import_queue.json`. All queue operations go through the DB `triage_queue` table.

## Section 3: Background Scan Architecture

### Unified scanner

Merge `watcher.ts` and `scan-manager.ts` into a single pipeline. Both paths (manual "Scan Now" and chokidar file watcher) feed into the same `processFile()` function.

### Scan lifecycle

1. User clicks "Scan Now" → server action creates a `scan_jobs` row (status: `running`) → kicks off async scan
2. Scanner walks the library path, updates `scan_jobs.processed_files` and `scan_jobs.current_file` as it goes
3. Each file runs through: Extract Signals → Resolve Series → Score → Route
4. On completion, updates `scan_jobs.status` to `completed` with final counts
5. Watcher mode: on `add` event, runs the same `processFile()` — no scan_job row needed for single-file events

### Progress consumption — two channels

- **REST polling** (`/api/scanner/status`) — reads latest `scan_jobs` row. Lightweight, polls every 2–3s during active scan. Used by global header indicator.
- **SSE stream** (`/api/scanner/stream`) — real-time file-by-file updates. Used by scanner detail view. Backed by the existing `progress-emitter.ts` EventEmitter singleton (kept for real-time, but `scan_jobs` is the persistent source of truth).

### `useScanStatus()` hook

Any component can subscribe to scan state. Polls REST endpoint, upgrades to SSE when a scan is active.

### Library path — single source

`appSettings` table key `library_path`. Settings UI writes to it, scanner reads from it. No more env var divergence.

## Section 4: Triage UI

### Dedicated page at `/triage`

Replaces the current split UI (Review Queue tab + Matching tab in Settings) with a single page.

### Layout — grouped by folder

- Files grouped by parent directory (usually = one series)
- Each group shows: folder name, file count, pipeline's best-guess series match (if any)
- Expand a group to see individual files with extracted signals, filename parse results, confidence score

### Actions per group

- **Approve** — accept the pipeline's suggested series match for all files in the group (one click, batch)
- **Re-match** — search ComicVine manually, pick a different series (applies to whole group)
- **Split** — drag individual files out into a separate group if pipeline grouped incorrectly
- **Reject** — remove from triage (marks `rejected`, doesn't delete from disk)

### Actions per file (when expanded)

- Override series assignment for just this file
- Edit extracted number/title if parser got it wrong

### Filtering and sorting

- Filter by confidence tier (high/medium/low)
- Sort by: date added, confidence, folder name
- Count badges: "12 pending, 3 high confidence, 5 medium, 4 low"

### Flow after approval

- Files move from `triage_queue` to `books` table (linked to confirmed series)
- If series doesn't exist, create from ComicVine data (or as local-only series if no CV match)
- Triage row marked `status: approved`

### Settings page cleanup

- Remove Review Queue and Matching tabs from Settings
- Keep Scanner tab (trigger + progress), Configuration, Preferences
- Add link from Scanner tab to `/triage` ("X files awaiting triage")

## Section 5: File Structure

### New files

| Path | Purpose |
|------|---------|
| `src/lib/scanner/pipeline.ts` | Core `processFile()` — extract signals, resolve series, score, route |
| `src/lib/scanner/signals.ts` | Signal extractors: `extractComicInfoSignals()`, `extractFolderSignals()`, `extractFilenameSignals()` |
| `src/lib/scanner/confidence.ts` | `scoreConfidence(signals, candidateSeries)` → 0–100 + tier |
| `src/lib/scanner/filename-parser.ts` | Robust series name + issue number extraction |
| `src/lib/scanner/unified-scanner.ts` | Replaces `scan-manager.ts` — walks library, creates scan_jobs, feeds files to pipeline |
| `src/actions/triage.ts` | Server actions: `getTriageItems()`, `approveGroup()`, `rejectGroup()`, `rematchGroup()`, `approveFile()` |
| `src/app/(dashboard)/triage/page.tsx` | Triage page (grouped file list) |
| `src/app/(dashboard)/triage/loading.tsx` | Skeleton |
| `src/hooks/use-scan-status.ts` | `useScanStatus()` hook (REST polling → SSE upgrade) |

### Modified files

| Path | Change |
|------|--------|
| `src/db/schema.ts` | Add `scan_jobs`, rename+extend `import_queue` → `triage_queue`, add `match_flags` to books, drop `seriesMatchCandidates` |
| `src/lib/scanner/watcher.ts` | Rewrite to use `processFile()` from pipeline |
| `src/lib/scanner/progress-emitter.ts` | Keep as-is |
| `src/lib/metadata/parser.ts` | Keep as-is |
| `src/app/(dashboard)/settings/page.tsx` | Remove Review Queue + Matching tabs, add triage link |
| `src/components/longbox/sidebar.tsx` | Add Triage nav link with pending count badge |
| `src/components/longbox/mobile-sidebar.tsx` | Same |

### Deleted files

| Path | Reason |
|------|--------|
| `src/lib/scanner/scan-manager.ts` | Replaced by `unified-scanner.ts` |
| `src/utils/queue.ts` | File-based queue → DB triage_queue |
| `config/import_queue.json` | File-based queue data |
| `/api/review/*` routes | Replaced by triage server actions |
| `/api/import/*` routes | Replaced by triage server actions |
