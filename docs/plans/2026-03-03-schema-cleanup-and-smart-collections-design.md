# Schema Cleanup & Smart Collections Design

Date: 2026-03-03
Status: Approved
Approach: Incremental Evolution (cleanup first, then smart collections)

---

## Part 1: Schema Cleanup

Four targeted changes to clean up legacy inconsistencies before building new features.

### 1A. Consolidate Request Tables

**Problem:** Two overlapping tables — `request` (series-level, proper enums) and `requests` (issue-level, loose varchar status).

**Solution:** Drop both, create a single `requests` table:

```sql
CREATE TABLE requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id),           -- nullable for system-generated
  series_id       uuid REFERENCES series(id),           -- nullable
  issue_id        uuid REFERENCES issues(id),           -- nullable (null = series-level request)
  title           text NOT NULL,                        -- display name
  issue_number    text,                                 -- specific issue if applicable
  publisher       text,
  cv_id           integer,                              -- ComicVine reference
  edition         edition_type DEFAULT 'issue',         -- issue/tpb/omnibus
  status          request_state DEFAULT 'draft',        -- draft/requested/searching/fulfilled
  webhook_sent    boolean DEFAULT false,
  requested_at    timestamp DEFAULT now(),
  fulfilled_at    timestamp,
  created_at      timestamp DEFAULT now()
);
```

**Migration:** Update `src/actions/requests.ts`, `src/app/(dashboard)/requests/`, and related components.

### 1B. Drop `readingHistory` Table

**Problem:** `readingHistory` duplicates `read_progress` (same columns: user_id, book_id, page, completed).

**Action:** Verify no code references it, then drop. Migrate any references to use `read_progress`.

### 1C. Rename `libraryMapping` → `series_match_candidates`

**Problem:** Komga-era column names (`komga_series_id`, `komga_folder_path`) that no longer make sense.

**Solution:**

```sql
CREATE TABLE series_match_candidates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_title           text NOT NULL,
  folder_path           text,
  series_id             uuid REFERENCES series(id),
  match_confidence      real,                           -- 0.0 to 1.0
  is_manually_verified  boolean DEFAULT false,
  created_at            timestamp DEFAULT now(),
  updated_at            timestamp DEFAULT now()
);
```

Foundation for Phase 2's multi-signal matching pipeline.

### 1D. Fix `automatch.ts` Broken Imports

`automatch.ts` imports from `@/utils/parser` and `@/utils/string` which may not exist. Create minimal stubs or inline the logic.

---

## Part 2: Smart Collections

### Schema Changes

Add columns to existing `collections` table:

```sql
ALTER TABLE collections
  ADD COLUMN smart_rules      jsonb,           -- null = manual collection
  ADD COLUMN pinned           boolean DEFAULT false,
  ADD COLUMN icon             text,            -- Lucide icon name
  ADD COLUMN sort_preference  text;            -- e.g. "title_asc", "date_added_desc"
```

### Smart Rules JSON Shape

```json
{
  "match": "all",
  "conditions": [
    { "field": "publisher", "operator": "is", "value": "DC Comics" },
    { "field": "reading_status", "operator": "is_not", "value": "completed" }
  ]
}
```

### Field/Operator Matrix

| Field | Operators | Value Type |
|-------|-----------|------------|
| `publisher` | is, is_not, contains | text |
| `reading_status` | is, is_not | enum: unread, in_progress, completed |
| `series_status` | is, is_not | enum: ongoing, ended, canceled |
| `date_added` | within_last, before, after | days (number) or date |
| `year` | is, before, after, between | number |
| `decade` | is | number (1990, 2000, etc.) |
| `has_comicvine_id` | is_true, is_false | boolean |
| `has_credits` | is_true, is_false | boolean |
| `page_count` | greater_than, less_than, between | number |
| `format` | is | cbz, cbr |
| `series_name` | contains, starts_with | text |
| `story_arc` | contains | text (jsonb search) |
| `author` | contains | text (jsonb search) |
| `collection_membership` | in, not_in | collection ID |
| `file_size` | greater_than, less_than | bytes |

Sort options: `title_asc`, `title_desc`, `date_added_asc`, `date_added_desc`, `issue_number_asc`, `issue_number_desc`, `year_asc`, `year_desc`, `publisher_asc`

### Rule Engine (`src/lib/rules-engine.ts`)

Pure function translating smart rules JSON to Drizzle ORM SQL fragments.

```typescript
type SmartRules = {
  match: "all" | "any";
  conditions: Condition[];
};

type Condition = {
  field: string;
  operator: string;
  value: string;
};

function buildWhereClause(rules: SmartRules): SQL | undefined
function getSmartCollectionCount(rules: SmartRules, userId: string): Promise<number>
function getSmartCollectionBooks(rules: SmartRules, userId: string, sort?: string, limit?: number, offset?: number): Promise<Book[]>
```

**Design decisions:**
- No materialization — query-time evaluation at ~2600 books is fast enough
- Pure function, no side effects, easy to test
- User-scoped (reading status and collection membership are per-user)
- Graceful degradation — skip invalid conditions, log warnings

**Caching:**
- `unstable_cache` with 30s TTL for counts, 60s TTL for book results
- Cache key: `collection_id + user_id + rules_hash`
- Tags: `smart-collection-${collectionId}`, `smart-collections-all`
- Invalidation via `revalidateTag("smart-collections-all")` on:
  - Reading progress changes
  - Book added/deleted by scanner
  - Collection rules updated

### UI: Rule Builder (`/collections/new`, `/collections/[id]/edit`)

Visual, Notion-style interface (mobile-first):

```
┌─────────────────────────────────┐
│ ← Create Smart Collection       │
├─────────────────────────────────┤
│ Icon: [BookOpen ▾]  Name: [___] │
├─────────────────────────────────┤
│ Match [all ▾] of the following: │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [Publisher ▾] [is ▾]        │ │
│ │ [DC Comics        ] [✕]    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [Reading Status ▾] [is ▾]  │ │
│ │ [Unread            ] [✕]   │ │
│ └─────────────────────────────┘ │
│ [+ Add condition]               │
├─────────────────────────────────┤
│ Sort by: [Date Added ▾] [↓]    │
├─────────────────────────────────┤
│ Preview: 142 books match        │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│ │   │ │   │ │   │ │   │ ...   │
│ └───┘ └───┘ └───┘ └───┘       │
├─────────────────────────────────┤
│ [  Pin to sidebar  ]            │
│ [     Save         ]            │
└─────────────────────────────────┘
```

**Components:**
- `RuleBuilder` — main form (client component)
- `ConditionRow` — field/operator/value selectors per condition
- `IconPicker` — grid of thematic Lucide icons
- `CollectionPreview` — live count (debounced 500ms) + horizontal cover strip

Also supports creating manual collections (name + icon, no rules).

### UI: Collections Page (`/collections`)

Card grid with 2x2 cover mosaics:

- Pinned collections shown at top with section label
- Each card: 2x2 cover mosaic (first 4 books), icon + name, book count
- Smart collections show a bolt/zap indicator
- Tap opens `/collections/[id]` (full book grid, existing pattern)
- Long-press or kebab: Edit rules, Unpin, Delete
- Empty state with "Create your first collection" CTA

### UI: Sidebar Integration

**Desktop:** Pinned collections appear below main nav, separated by "Collections" label. Each shows Lucide icon + name. "All" link at bottom goes to `/collections`.

**Mobile:** Horizontal chip row on dashboard above existing widgets. Each chip shows name + count. Horizontal scroll. Tap navigates to collection.

### Starter Collections (seeded on first run)

| Name | Icon | Rules | Pinned |
|------|------|-------|--------|
| Unread | BookOpen | reading_status IS unread | Yes |
| Recently Added | Clock | date_added WITHIN_LAST 30 | Yes |
| Needs Metadata | AlertTriangle | has_comicvine_id IS false | No |
| Ongoing Series | Flame | series_status IS ongoing | No |

---

## File Map

### New Files
- `src/lib/rules-engine.ts` — Rule-to-SQL translation engine
- `src/app/(dashboard)/collections/page.tsx` — Collections grid page
- `src/app/(dashboard)/collections/new/page.tsx` — Create collection / rule builder
- `src/app/(dashboard)/collections/[id]/page.tsx` — Collection detail (book grid)
- `src/app/(dashboard)/collections/[id]/edit/page.tsx` — Edit collection rules
- `src/components/longbox/rule-builder.tsx` — Rule builder form
- `src/components/longbox/condition-row.tsx` — Single condition row
- `src/components/longbox/icon-picker.tsx` — Lucide icon grid picker
- `src/components/longbox/collection-preview.tsx` — Live preview count + covers
- `src/components/longbox/collection-card.tsx` — Grid card with mosaic
- `src/components/longbox/pinned-collections-sidebar.tsx` — Sidebar section
- `src/components/longbox/pinned-collections-chips.tsx` — Mobile chip row

### Modified Files
- `src/db/schema.ts` — Schema changes (cleanup + new columns)
- `src/actions/collections.ts` — Add smart collection CRUD, preview endpoint
- `src/actions/requests.ts` — Update to use consolidated table
- `src/actions/reading.ts` — Add cache invalidation
- `src/components/longbox/sidebar.tsx` — Add pinned collections section
- `src/app/(dashboard)/page.tsx` — Add mobile chip row
- `src/app/(dashboard)/requests/page.tsx` — Update to use new requests table
- `src/types/longbox.ts` — Add SmartRules, Condition types
