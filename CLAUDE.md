# Longbox - Comic Library Manager

Self-hosted comic library manager for organizing, reading, and tracking comic collections. Built for large libraries (2000+ series, 2600+ issues).

## Quick Reference
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npx drizzle-kit push` - Push schema changes to DB
- `npx drizzle-kit generate` - Generate migrations

## Tech Stack
- Next.js 16.1 (App Router) with React 19, TypeScript (strict)
- PostgreSQL + Drizzle ORM (schema: src/db/schema.ts, config: drizzle.config.ts)
- NextAuth.js 5.0-beta (credentials + OAuth) - config in src/lib/auth.ts
- Tailwind CSS 4 + shadcn/ui (Radix primitives) + Lucide icons + Recharts
- React Compiler enabled in next.config.ts

## Design Principles
- **Icons**: Lucide only. No emoji in UI. Icon choices should feel thematic to comics (BookOpen, Swords, Shield, Skull, Crown, Flame, etc.)
- **Color palette**: Muted dark green theme. No bright or saturated colors. Accent color is desaturated sage green at low opacity. Background gradient: `linear-gradient(160deg, #0a0f0a 0%, #0d1410 50%, #0a120e 100%)`. Borders at `rgba(255,255,255,0.06)`. Text: `#c0c8b8` primary, `rgba(255,255,255,0.32)` muted, `rgba(255,255,255,0.18)` dim. Accent: `rgba(160,180,145,0.5)`.
- **Mobile-first**: Primary use case is phone browser (Android). Every feature must work well on mobile. Thumb-friendly tap targets, bottom nav patterns, horizontal scroll for collections.
- **Numbers over charts**: Stats/analysis should lead with concrete numbers and stat cards. Charts only where pattern recognition genuinely benefits (publisher distribution bar chart, reading sparkline). No chart fluff.
- **Suggest, don't force**: Auto-link high confidence matches, suggest low confidence ones. Never auto-create requests. Show gaps, let user decide.
- **Background processes**: Scans, metadata fetching, matching — all server-side, never tied to browser session. User can navigate away freely.
- **Toast notifications**: Via Sonner. Never use alert/confirm dialogs.
- **Empty states**: Use `<EmptyState>` component. Always provide a clear action or explanation.

## Project Structure

### Existing
- `src/actions/` - Server actions (auth, library, collections, favorites, reading, etc.)
- `src/app/(auth)/` - Login/signup pages
- `src/app/(dashboard)/` - Protected routes (library, search, discovery, settings, profile, collections)
- `src/app/(dashboard)/collections/` - Collections grid, create/edit, detail pages
- `src/app/read/[id]/` - Comic reader (standalone layout)
- `src/app/api/` - API routes (cover serving, auth, scanner stream, stats)
- `src/components/longbox/` - Domain components (50+ files)
- `src/components/ui/` - shadcn/ui base components
- `src/components/reader/` - Comic reader UI
- `src/db/schema.ts` - Full DB schema (20 tables, 5 domains: auth, metadata, user features, system, activity)
- `src/lib/data/` - Data access layer (reading-progress.ts)
- `src/lib/rules-engine.ts` - Smart collection rule → Drizzle WHERE clause translator
- `src/lib/field-definitions.ts` - Rule builder field/operator/value definitions (15 fields)
- `src/lib/utils/` - Utilities (comic-metadata.ts, comic-cover-extractor.ts)
- `src/lib/comicvine.ts` - ComicVine API client
- `src/lib/metron.ts` - Metron API client
- `src/lib/scanner/` - File scanner, watcher, matching pipeline, confidence scoring
- `src/lib/scanner/pipeline.ts` - Core processFile() matching pipeline
- `src/lib/scanner/signals.ts` - Signal extractors (ComicInfo, folder, filename)
- `src/lib/scanner/confidence.ts` - Confidence scoring (0-100, tiers: high/medium/low)
- `src/lib/scanner/filename-parser.ts` - Series name + issue number extraction from filenames
- `src/lib/scanner/unified-scanner.ts` - Full library scan with scan_jobs tracking
- `src/actions/triage.ts` - Triage server actions (approve/reject groups, file-level ops)
- `src/app/(dashboard)/triage/` - Triage page (grouped unmatched files)
- `src/hooks/use-scan-status.ts` - useScanStatus() hook (REST polling)
- `src/lib/activity-logger.ts` - Activity event logger (logEvent helper, fire-and-forget)
- `src/actions/activity.ts` - Activity feed server actions (getRecentActivity, getActivityEvents)
- `src/actions/analysis.ts` - Library analytics server actions (composition, health, completion, reading)
- `src/app/(dashboard)/activity/` - Activity feed page (filters, date grouping, pagination)
- `src/app/(dashboard)/analysis/` - Library analytics page (4 sections with Recharts)
- `src/components/longbox/recent-activity.tsx` - Dashboard activity widget (last 5 events)
- `src/components/longbox/activity-event-row.tsx` - Activity event row (icon + message + timestamp)
- `src/components/longbox/stat-progress-bar.tsx` - Reusable progress bar for analytics
- `src/components/longbox/reading-sparkline.tsx` - Recharts reading pace sparkline
- `src/components/longbox/publisher-chart.tsx` - Recharts horizontal bar chart
- `src/types/longbox.ts` - Shared TypeScript types (SmartRules, Condition, FieldDefinition, etc.)
- `src/middleware.ts` - Auth middleware

### Planned (new paths for upcoming features)
- `src/app/api/opds/v1.2/` - OPDS feed endpoints for Mihon
- `src/app/api/webhooks/` - Outbound webhook dispatch
- `src/lib/opds.ts` - OPDS Atom XML builder helpers
- `src/lib/webhooks.ts` - Webhook dispatch utility (n8n integration)

## Code Conventions
- Path alias: `@/*` maps to `./src/*`
- Server components by default; client components use `"use client"` directive
- Server actions in `src/actions/` with `"use server"` directive
- Toast notifications via Sonner (not alert/confirm)
- Loading states via `loading.tsx` skeleton files in each route
- Empty states use `<EmptyState>` component from `src/components/longbox/empty-state.tsx`
- Reusable cards: `SeriesGridCard`, `IssueGridCard`, `CollectionCard` - don't create inline card markup
- Dynamic Lucide icons: use `DynamicIcon` from `icon-picker.tsx` (maps icon name string to component)
- Hero headers use `<HeroHeader>` component (40vh, min 300px)
- Cover images served via `/api/cover/[bookId]` with disk cache at `public/cache/covers/`
- Comic files (CBZ/CBR) extracted via yauzl/node-unrar-js; covers resized with sharp
- Env validation via Zod in `src/lib/env.ts`, runs at startup in `src/instrumentation.ts`

## Database
- PostgreSQL with individual connection vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- Defaults: localhost:5432, user=longbox, password=longbox_secret, db=longbox
- UUIDs for primary keys (defaultRandom)
- Enums: series_status (ongoing/ended/canceled), edition_type (issue/tpb/omnibus), request_state (draft/requested/searching/fulfilled)

### Recent Schema Changes (completed)
- `readingHistory` table dropped (duplicated `read_progress`)
- `seriesMatchCandidates` table dropped (replaced by triageQueue pipeline)
- `request` + `requests` consolidated into single `requests` table
- Collections table gained: `smart_rules` (jsonb), `pinned` (boolean), `icon` (text), `sort_preference` (text)
- `scan_jobs` table added (tracks scan state: status, files, matched, errors, current_file)
- `import_queue` renamed to `triage_queue` (triageQueue) with pipeline columns: match_confidence, matched_series_id, signals, status, scan_job_id
- `books` table gained: `match_flags` (text array) for tracking ["low_confidence", "needs_metadata"]
- `activity_events` table added (type, message, metadata jsonb, severity, created_at — indexes on created_at and type)

## Architecture Patterns

### Smart Collections (Rule Engine) — Built
Collections are either manual (join table for membership) or smart (jsonb rules evaluated at query time). Rule engine in `src/lib/rules-engine.ts` translates conditions to Drizzle `where` clauses:
```typescript
function buildWhereClause(rules: SmartRules, userId: string): SQL {
  const conditions = rules.conditions.map(c => buildCondition(c, userId));
  return rules.match === "all" ? and(...conditions) : or(...conditions);
}
```
Supports 15 fields: publisher, series_name, series_status, year, decade, author, story_arc, format, reading_status, date_added, page_count, has_comicvine_id, has_credits, collection_membership, file_size.

At ~2600 issues, query-time evaluation is fast enough. No materialization needed yet. Cached via `unstable_cache` with 30s/60s TTL and `smart-collections-all` tag. `invalidateSmartCollections()` called on reading progress changes. Preview uses uncached queries for real-time feedback (debounced 500ms in UI).

### Background Server Processes
Scans, metadata fetching, and matching run server-side, completely decoupled from the client. Pattern:
1. User action triggers server action → kicks off background task
2. Background task writes progress to `scan_jobs` table
3. Client consumes status via two channels:
   - REST polling (`/api/scanner/status`) - lightweight, used by global header indicator, polls every 2-3s during active scan
   - SSE stream (`/api/scanner/stream`) - real-time, used by scanner detail page
4. `useScanStatus()` React hook available for any component to consume scan state

### Scanner Multi-Signal Matching — Built
Pipeline in `src/lib/scanner/pipeline.ts`. Each file goes through:
1. **Signal extraction** (`signals.ts`): ComicInfo.xml, folder name, filename parsed in parallel
2. **Series resolution**: exact match in DB, then case-insensitive (ilike)
3. **Confidence scoring** (`confidence.ts`): ComicInfo match +40, folder +25, filename +15, metadata bonuses +5 each
4. **Routing by tier**:
   - High (>=90%): auto-link to series silently
   - Medium (60-89%): auto-link but flag with `match_flags: ['low_confidence']`
   - Low (<60%): queue in `triageQueue` for manual review via `/triage` page
Library path from single source: `appSettings` table key `library_path`.

### Activity Logging — Built
Events recorded via `logEvent()` from `src/lib/activity-logger.ts`. Fire-and-forget pattern — never throws, logs to console on failure. Instrumented at: scanner lifecycle (scan_started, scan_complete, errors), triage approve/reject, book completion, collection CRUD. Events stored in `activity_events` table with type, message, metadata (jsonb), severity, created_at. Dashboard widget shows last 5 events. `/activity` page supports type and severity filters with date grouping and "load more" pagination.

### Library Analytics — Built
Four server actions in `src/actions/analysis.ts`, each independently Suspense-wrapped on the `/analysis` page:
1. **Composition:** stat cards (series/books/size/avg pages) + publisher bar chart (Recharts, top 10 + Other) + decade breakdown
2. **Metadata Health:** progress bars (ComicVine linked, has credits, has page data) + flagged count
3. **Series Completion:** complete/almost/in-progress counts + top 10 almost-complete table (requires ComicVine issue data)
4. **Reading Stats:** books read/in progress/pages/streak + weekly pace sparkline (Recharts AreaChart, 12 weeks)

### Webhook-Out Pattern (n8n Integration)
Longbox emits webhooks for external automation. Never fetches/downloads content.
- Configurable webhook URL in settings
- Fires on: new request created, scan completed, errors
- Payload includes enough context for n8n to route (series name, issue number, publisher, ComicVine ID)
- n8n handles routing to Telegram/email/Notion/Kapowarr

### OPDS Feed (Mihon Integration)
OPDS 1.2 Atom XML feeds for external reader apps:
- Navigation feeds for browsing (by series, recent, reading list)
- Acquisition feeds with download links to CBZ/CBR files
- HTTP Basic Auth against Longbox user credentials
- Smart collections can auto-generate OPDS catalog sections
- Endpoints under `/api/opds/v1.2/` (catalog, series, search, new, reading, download)

## Integration Points

### ComicVine API
- Primary metadata source for covers, descriptions, publisher info
- API key stored in DB via Settings > Configuration page (not .env)
- Client: `src/lib/comicvine.ts`
- Rate limited — respect API limits, queue requests

### Metron API
- Secondary source for credits and story arcs
- Username + API key stored in DB via Settings > Configuration
- Client: `src/lib/metron.ts`
- Not yet configured in current deployment

### n8n (Automation)
- Connected MCP server at `https://automation.vidiai.ch/mcp-server/http`
- Receives webhooks from Longbox for request notifications
- Could be extended for scan completion alerts, error notifications

### Kapowarr (Downloads)
- Separate application, no API yet
- Integration via filesystem: Kapowarr downloads to a watched folder
- Longbox's chokidar watcher detects new files → auto-import → match → fulfill requests
- Configure watched directories in Settings

### Mihon (External Reader)
- Android comic reader app (Tachiyomi fork)
- Connects via OPDS 1.2 catalog feed
- User configures: `http://<server-ip>:3000/api/opds/v1.2/catalog` + credentials

## Feature Roadmap

### ✅ Built
- Library browsing with series/issue grid views
- Comic reader (CBZ/CBR extraction, page navigation)
- File scanner with filesystem watcher
- ComicVine/Metron API clients
- Reading progress tracking
- Favorites system
- User auth (credentials + OAuth)
- Settings page (Scanner, Configuration, Preferences)
- Cover extraction and caching
- Smart collections (rule engine, CRUD, rule builder UI, live preview)
- Collections pages (grid, detail, create/edit with smart/manual modes)
- Sidebar pinned collections + mobile dashboard chips
- Starter collections seeded on first run (Unread, Recently Added, Needs Metadata, Ongoing)
- Schema cleanup (consolidated requests, dropped seriesMatchCandidates + readingHistory, added scan_jobs + triageQueue)
- Scanner matching pipeline (signal extraction, confidence scoring, auto-link/triage routing)
- Triage page (grouped by folder, batch approve/reject, confidence badges)
- Unified scanner (scan_jobs persistence, replaces old dual-queue system)
- useScanStatus() hook + REST polling endpoint

### ✅ Phase 1: Smart Collections (Complete)
- [x] Schema: add smart_rules, pinned, icon, sort_preference to collections table
- [x] Rule engine: buildWhereClause() translating rules to Drizzle queries (15 fields)
- [x] Rule builder UI (visual, Notion-style condition rows + live preview)
- [x] Collections page (grid of cards with 2x2 cover mosaic)
- [x] Sidebar integration (pinned collections in nav, both desktop & mobile)
- [x] Mobile: horizontal chip row on dashboard
- [x] Starter collections seeded on first run (Unread, Recently Added, Needs Metadata, Ongoing)
- [x] Cache invalidation on reading progress changes

### ✅ Phase 2: Scanner Intelligence & Series Linking (Complete)
- [x] Filename parser (series name + issue extraction, punctuation normalization)
- [x] Signal extractors (ComicInfo.xml, folder name, filename) with priority: ComicInfo > Folder > Filename
- [x] Confidence scoring (0-100 scale, tiers: high >=90, medium >=60, low <60)
- [x] Matching pipeline: extract signals → resolve series → score → route (auto-link/flag/triage)
- [x] Unified scanner (replaces old scan-manager + file-based queue)
- [x] Watcher rewrite (uses pipeline instead of inline matching)
- [x] scan_jobs table (persistent scan state, REST polling endpoint)
- [x] triageQueue table (replaces importQueue with confidence + signals columns)
- [x] Triage page (/triage) with grouped-by-folder display, batch approve/reject
- [x] useScanStatus() hook for any component
- [x] Settings page cleanup (removed Review Queue + Matching tabs, added Triage link)
- [x] Deleted legacy: scan-manager, file-based queue, old API routes, review/import pages

### ✅ Phase 3: Activity & Analysis (Complete)
- [x] Activity events table (`activity_events`) + `logEvent()` fire-and-forget helper
- [x] Instrumented: scanner (start/complete/error), triage (approve/reject), reading (completed), collections (create/delete)
- [x] Dashboard activity widget (last 5 events with icons and relative timestamps)
- [x] Dedicated /activity page (type + severity filters, date grouping, load-more pagination)
- [x] Analysis page: library composition (stat cards, publisher bar chart, decade bar chart via Recharts)
- [x] Analysis: metadata health with progress bars (ComicVine linked, credits, page data)
- [x] Analysis: series completion tracking (complete/almost/in-progress stats + top 10 table)
- [x] Analysis: reading stats (books read, pages, streaks, weekly sparkline via Recharts)
- [x] Sidebar links for Activity and Analysis (both desktop and mobile)

### 🔨 Phase 4: Request System
- [ ] Wishlist/request board (/requests page)
- [ ] Series completion gap detection with "Request Missing" action
- [ ] Request states: wanted → fulfilled (auto-fulfilled by scanner)
- [ ] Kapowarr folder watch integration
- [ ] n8n webhook on new requests
- [ ] Fulfillment notifications

### 🔨 Phase 5: Reader & External Access
- [ ] Reader zoom: react-zoom-pan-pinch (pinch/pan/double-tap)
- [ ] Discovery page fix (diagnose empty state, add default content)
- [ ] OPDS 1.2 feed for Mihon (7 route handlers + auth)
- [ ] PWA support (service worker, manifest, offline caching)

## Gotchas
- Next.js 16.1: `revalidateTag()` requires 2 args. Use `updateTag()` from `next/cache` instead (single arg)
- node-unrar-js requires WASM support - configured in next.config.ts webpack config
- `serverExternalPackages: ['node-unrar-js']` required in next.config.ts
- `output: 'standalone'` set for Docker builds
- Cover cache dir (`public/cache/covers/`) is gitignored - must be writable in production
- ComicVine API key is stored in DB (Settings > Configuration), NOT in .env
- Library path: single source of truth is `appSettings` table (key: `library_path`), not env vars
- Reusable cards: `TriageGroupCard` for triage page groups
- No test suite exists yet