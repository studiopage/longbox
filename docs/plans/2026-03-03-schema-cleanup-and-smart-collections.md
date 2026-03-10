# Schema Cleanup & Smart Collections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up legacy schema inconsistencies, then build a smart collections system with a visual rule builder, cached query engine, and sidebar integration.

**Architecture:** Incremental approach — 4 schema cleanup tasks first (consolidate request tables, drop orphaned readingHistory, rename libraryMapping, fix automatch imports), then smart collections built on the cleaned foundation. Rule engine is a pure function translating jsonb rules to Drizzle SQL. Caching via unstable_cache with revalidateTag invalidation.

**Tech Stack:** Next.js 16.1, Drizzle ORM, PostgreSQL, React 19, Tailwind CSS 4, shadcn/ui, Lucide icons

---

## Phase A: Schema Cleanup

### Task 1: Drop the `readingHistory` Table

No code references this table — it's an orphaned export. Safe to delete.

**Files:**
- Modify: `src/db/schema.ts:318-327`

**Step 1: Remove readingHistory from schema**

Delete the entire `readingHistory` table definition (lines 318-327):

```typescript
// DELETE THIS ENTIRE BLOCK:
export const readingHistory = pgTable('reading_history', {
  user_id: uuid('user_id').notNull(),
  book_id: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  page: integer('page').default(1),
  completed: boolean('completed').default(false),
  read_date: timestamp('read_date', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.book_id] }),
}));
```

**Step 2: Push schema change to DB**

Run: `npx drizzle-kit push`
Expected: Table `reading_history` dropped successfully.

**Step 3: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds with no references to `readingHistory`.

**Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "chore: drop orphaned readingHistory table (duplicates read_progress)"
```

---

### Task 2: Rename `libraryMapping` → `seriesMatchCandidates`

This table has Komga-era column names. Rename the table and clean up columns. Used in 3 files beyond the schema.

**Files:**
- Modify: `src/db/schema.ts:137-183` (table + relations)
- Modify: `src/db/queries/dashboard.ts:2,19-33`
- Modify: `src/db/queries/series.ts:2,29,33`
- Modify: `src/actions/match.ts:4,37-44`

**Step 1: Update schema table definition**

In `src/db/schema.ts`, replace the `libraryMapping` definition (lines 137-147) with:

```typescript
// Series Match Candidates - Tracks potential series matches from scanner
export const seriesMatchCandidates = pgTable('series_match_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  local_title: text('local_title').notNull(),
  folder_path: text('folder_path'),
  series_id: uuid('series_id').references(() => series.id, { onDelete: 'set null' }),
  match_confidence: real('match_confidence').default(0),
  is_manually_verified: boolean('is_manually_verified').default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
```

**Step 2: Update relations in schema**

Replace `seriesRelations` (line 164-169) — change `libraryMappings: many(libraryMapping)` to `matchCandidates: many(seriesMatchCandidates)`.

Replace `libraryMappingRelations` (lines 178-183) with:

```typescript
export const seriesMatchCandidatesRelations = relations(seriesMatchCandidates, ({ one }) => ({
  series: one(series, {
    fields: [seriesMatchCandidates.series_id],
    references: [series.id],
  }),
}));
```

**Step 3: Update `src/db/queries/dashboard.ts`**

Replace all `libraryMapping` references with `seriesMatchCandidates`:
- Line 2: import `seriesMatchCandidates` instead of `libraryMapping`
- Line 19: `from(seriesMatchCandidates).where(eq(seriesMatchCandidates.is_manually_verified, true))`
- Line 20: `from(seriesMatchCandidates)`
- Line 31: `.innerJoin(seriesMatchCandidates, eq(seriesMatchCandidates.series_id, series.id))`
- Line 32: `.orderBy(desc(seriesMatchCandidates.updated_at))`

**Step 4: Update `src/db/queries/series.ts`**

- Line 2: import `seriesMatchCandidates` instead of `libraryMapping`
- Line 29: `local: seriesMatchCandidates`
- Line 33: `.leftJoin(seriesMatchCandidates, eq(seriesMatchCandidates.series_id, series.id))`

**Step 5: Update `src/actions/match.ts`**

- Line 4: import `seriesMatchCandidates` instead of `libraryMapping`
- Line 37: `await db.update(seriesMatchCandidates)`
- Line 44: `.where(eq(seriesMatchCandidates.id, data.mappingId))`

**Step 6: Search for any remaining references**

Run: `grep -r "libraryMapping\|library_mapping" src/ --include="*.ts" --include="*.tsx"`
Expected: No results.

**Step 7: Push schema change and verify build**

Run: `npx drizzle-kit push && npm run build`
Expected: Old table dropped, new table created, build succeeds.

**Step 8: Commit**

```bash
git add src/db/schema.ts src/db/queries/dashboard.ts src/db/queries/series.ts src/actions/match.ts
git commit -m "refactor: rename libraryMapping to seriesMatchCandidates, clean up Komga-era columns"
```

---

### Task 3: Consolidate Request Tables

Two tables (`request` singular and `requests` plural) serve overlapping purposes. Consolidate into a single `requests` table that handles both series-level and issue-level requests.

**Files:**
- Modify: `src/db/schema.ts:126-209` (both table defs + relations)
- Modify: `src/types/longbox.ts:1-29`
- Modify: `src/actions/requests.ts` (entire file — uses `requests` plural)
- Modify: `src/actions/import.ts:4,43-48` (uses `request` singular)
- Modify: `src/actions/create-from-cv.ts:4,34-39` (uses `request` singular)
- Modify: `src/db/queries/dashboard.ts:2,18` (uses `request` singular)
- Modify: `src/db/queries/series.ts:2,28,32` (uses `request` singular)
- Modify: `src/app/(dashboard)/requests/page.tsx` (uses `requests` plural)
- Modify: `src/components/longbox/queue-actions.tsx` (calls deleteRequestAction)

**Step 1: Replace both table definitions in schema**

In `src/db/schema.ts`, remove the old `request` table (lines 126-133) and the old `requests` table (lines 194-203). Replace with a single unified table:

```typescript
// Requests table - Unified wishlist/download queue
export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  series_id: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }),
  issue_id: uuid('issue_id').references(() => issues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  issue_number: text('issue_number'),
  publisher: text('publisher'),
  cv_id: integer('cv_id'),
  edition: editionTypeEnum('edition').default('issue'),
  status: requestStateEnum('status').default('draft'),
  webhook_sent: boolean('webhook_sent').default(false),
  requested_at: timestamp('requested_at').defaultNow(),
  fulfilled_at: timestamp('fulfilled_at'),
  created_at: timestamp('created_at').defaultNow(),
});
```

**Step 2: Update relations in schema**

Replace both `requestRelations` and `requestsRelations` with a single:

```typescript
export const requestsRelations = relations(requests, ({ one }) => ({
  user: one(users, { fields: [requests.user_id], references: [users.id] }),
  series: one(series, { fields: [requests.series_id], references: [series.id] }),
  issue: one(issues, { fields: [requests.issue_id], references: [issues.id] }),
}));
```

Update `seriesRelations` to reference `requests` (not `request`):
```typescript
requests: many(requests),
```

Update `issuesRelations` — it already references `requests` (plural), so it should be fine.

**Step 3: Update `src/types/longbox.ts`**

Replace the `Request` interface to match the new schema:

```typescript
export interface Request {
  id: string;
  userId: string | null;
  seriesId: string | null;
  issueId: string | null;
  title: string;
  issueNumber: string | null;
  publisher: string | null;
  cvId: number | null;
  edition: EditionType;
  status: RequestState;
  webhookSent: boolean;
  requestedAt: Date | null;
  fulfilledAt: Date | null;
  createdAt: Date | null;
}
```

**Step 4: Update `src/actions/import.ts`**

Change import from `request` to `requests` (line 4). Update the insert (line 43-48):

```typescript
await db.insert(requests).values({
  series_id: seriesId,
  title: title,
  publisher: publisher,
  cv_id: parseInt(cvId),
  edition: 'tpb',
  status: 'requested',
});
```

**Step 5: Update `src/actions/create-from-cv.ts`**

Change import from `request` to `requests` (line 4). Update the insert (line 34-39):

```typescript
await db.insert(requests).values({
  series_id: newSeriesId,
  title: data.title,
  publisher: data.publisher,
  cv_id: parseInt(data.cvId),
  edition: 'tpb',
  status: 'requested',
});
```

**Step 6: Update `src/actions/requests.ts`**

The `requestIssueAction` now needs to populate the `title` field. Update:

```typescript
export async function requestIssueAction(issueId: string) {
  const [issue] = await db.select()
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!issue || !issue.series_id) {
    return { success: false, message: "Issue not found" };
  }

  // Get series name for the title
  const [ser] = await db.select({ name: series.name, publisher: series.publisher })
    .from(series)
    .where(eq(series.id, issue.series_id))
    .limit(1);

  await db.update(issues)
    .set({ status: 'wanted' })
    .where(eq(issues.id, issueId));

  await db.insert(requests).values({
    issue_id: issueId,
    series_id: issue.series_id,
    title: ser?.name || 'Unknown',
    issue_number: issue.issue_number,
    publisher: ser?.publisher || null,
    cv_id: issue.cv_id || null,
    status: 'requested',
  });

  revalidatePath(`/series/${issue.series_id}`);
  return { success: true };
}
```

Update `requestAllMissingAction` similarly — add `title`, `issue_number`, `publisher` to each request row.

**Step 7: Update `src/db/queries/dashboard.ts`**

Change import: `requests` instead of `request` (line 2).
Line 18: `db.select({ count: count() }).from(requests)`

**Step 8: Update `src/db/queries/series.ts`**

Change import: `requests` instead of `request` (line 2).
Line 28: `request: requests` (or rename the alias)
Line 32: `.leftJoin(requests, eq(requests.series_id, series.id))`

**Step 9: Update `src/app/(dashboard)/requests/page.tsx`**

The page query already uses `requests` (plural) but the column references need updating since `status` is now an enum, not varchar. The query shape changes slightly — `requests.status` now returns the enum value. The page should mostly work as-is since we kept the same column name. Verify the Badge renders correctly with the enum values.

**Step 10: Push schema change and verify**

Run: `npx drizzle-kit push && npm run build`
Expected: Old `request` table dropped, `requests` table recreated with new columns, build succeeds.

**Step 11: Commit**

```bash
git add src/db/schema.ts src/types/longbox.ts src/actions/requests.ts src/actions/import.ts src/actions/create-from-cv.ts src/db/queries/dashboard.ts src/db/queries/series.ts src/app/\(dashboard\)/requests/page.tsx
git commit -m "refactor: consolidate request + requests tables into single unified requests table"
```

---

### Task 4: Fix `automatch.ts` Imports

The `automatch.ts` action imports from `@/utils/parser`, `@/utils/queue`, and `@/utils/string` — these files DO exist but may have issues. Verify they work, and note that `automatch.ts` will be substantially rewritten in Phase 2 (scanner intelligence). For now, just ensure it doesn't break the build.

**Files:**
- Read: `src/utils/parser.ts`, `src/utils/queue.ts`, `src/utils/string.ts`
- Possibly modify: `src/actions/automatch.ts`

**Step 1: Read and verify the utility files**

Read `src/utils/parser.ts`, `src/utils/queue.ts`, `src/utils/string.ts`. Verify they export `parseFilename`, `QueueManager`, `getSimilarity`, and `normalize` respectively.

**Step 2: Verify the build**

Run: `npm run build`

If it fails on automatch.ts, fix the specific import issue. If it passes, no action needed.

**Step 3: Commit (only if changes were needed)**

```bash
git add src/actions/automatch.ts src/utils/
git commit -m "fix: verify automatch.ts utility imports work correctly"
```

---

## Phase B: Smart Collections

### Task 5: Add Smart Collection Columns to Schema

**Files:**
- Modify: `src/db/schema.ts:352-361` (collections table)

**Step 1: Add new columns to collections table**

Add after the existing `updated_at` column:

```typescript
export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  cover_book_id: uuid('cover_book_id').references(() => books.id, { onDelete: 'set null' }),

  // Smart collection fields
  smart_rules: jsonb('smart_rules'),        // null = manual collection
  pinned: boolean('pinned').default(false),
  icon: text('icon'),                        // Lucide icon name
  sort_preference: text('sort_preference'),  // e.g. "title_asc", "date_added_desc"

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

**Step 2: Push schema and verify**

Run: `npx drizzle-kit push && npm run build`
Expected: 4 new columns added, build succeeds.

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add smart_rules, pinned, icon, sort_preference columns to collections"
```

---

### Task 6: Add TypeScript Types for Smart Collections

**Files:**
- Modify: `src/types/longbox.ts`

**Step 1: Add smart collection types**

Append to `src/types/longbox.ts`:

```typescript
// Smart Collection types
export type ConditionField =
  | 'publisher'
  | 'reading_status'
  | 'series_status'
  | 'date_added'
  | 'year'
  | 'decade'
  | 'has_comicvine_id'
  | 'has_credits'
  | 'page_count'
  | 'format'
  | 'series_name'
  | 'story_arc'
  | 'author'
  | 'collection_membership'
  | 'file_size';

export type ConditionOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'starts_with'
  | 'is_true'
  | 'is_false'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'within_last'
  | 'before'
  | 'after'
  | 'in'
  | 'not_in';

export interface Condition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

export interface SmartRules {
  match: 'all' | 'any';
  conditions: Condition[];
}

export type SortPreference =
  | 'title_asc'
  | 'title_desc'
  | 'date_added_asc'
  | 'date_added_desc'
  | 'issue_number_asc'
  | 'issue_number_desc'
  | 'year_asc'
  | 'year_desc'
  | 'publisher_asc';

// Field metadata for the rule builder UI
export interface FieldDefinition {
  field: ConditionField;
  label: string;
  group: 'Metadata' | 'Reading' | 'Library';
  operators: ConditionOperator[];
  valueType: 'text' | 'enum' | 'number' | 'boolean' | 'date' | 'collection';
  enumValues?: { label: string; value: string }[];
}
```

**Step 2: Commit**

```bash
git add src/types/longbox.ts
git commit -m "feat: add SmartRules, Condition, and FieldDefinition types"
```

---

### Task 7: Build the Rule Engine

The core of smart collections — translates jsonb rules into Drizzle SQL queries.

**Files:**
- Create: `src/lib/rules-engine.ts`

**Step 1: Create the rule engine file**

Create `src/lib/rules-engine.ts` with the following implementation:

```typescript
import { db } from '@/db';
import { books, series, read_progress, collectionItems } from '@/db/schema';
import { eq, ne, and, or, like, gt, lt, gte, lte, isNull, isNotNull, inArray, notInArray, count, sql, SQL } from 'drizzle-orm';
import { unstable_cache, revalidateTag } from 'next/cache';
import type { SmartRules, Condition } from '@/types/longbox';

/**
 * Build a single Drizzle SQL condition from a rule condition.
 * Returns undefined if the condition is invalid (graceful degradation).
 */
function buildCondition(condition: Condition, userId: string): SQL | undefined {
  const { field, operator, value } = condition;

  try {
    switch (field) {
      case 'publisher':
        if (operator === 'is') return eq(books.publisher, value);
        if (operator === 'is_not') return ne(books.publisher, value);
        if (operator === 'contains') return like(books.publisher, `%${value}%`);
        break;

      case 'series_name':
        if (operator === 'contains') return like(series.name, `%${value}%`);
        if (operator === 'starts_with') return like(series.name, `${value}%`);
        break;

      case 'reading_status': {
        // unread = no read_progress row OR is_completed = false AND page <= 1
        // in_progress = has read_progress, not completed, page > 1
        // completed = is_completed = true
        const subquery = db
          .select({ book_id: read_progress.book_id })
          .from(read_progress)
          .where(
            and(
              eq(read_progress.book_id, books.id),
              eq(read_progress.user_id, userId),
              eq(read_progress.is_completed, true)
            )
          );

        const progressSubquery = db
          .select({ book_id: read_progress.book_id })
          .from(read_progress)
          .where(
            and(
              eq(read_progress.book_id, books.id),
              eq(read_progress.user_id, userId),
              gt(read_progress.page, 1),
              eq(read_progress.is_completed, false)
            )
          );

        if (value === 'completed') {
          const cond = sql`EXISTS (${subquery})`;
          return operator === 'is' ? cond : sql`NOT EXISTS (${subquery})`;
        }
        if (value === 'in_progress') {
          const cond = sql`EXISTS (${progressSubquery})`;
          return operator === 'is' ? cond : sql`NOT EXISTS (${progressSubquery})`;
        }
        if (value === 'unread') {
          const anyProgressSubquery = db
            .select({ book_id: read_progress.book_id })
            .from(read_progress)
            .where(
              and(
                eq(read_progress.book_id, books.id),
                eq(read_progress.user_id, userId),
                or(eq(read_progress.is_completed, true), gt(read_progress.page, 1))
              )
            );
          const cond = sql`NOT EXISTS (${anyProgressSubquery})`;
          return operator === 'is' ? cond : sql`EXISTS (${anyProgressSubquery})`;
        }
        break;
      }

      case 'series_status':
        if (operator === 'is') return eq(series.status, value);
        if (operator === 'is_not') return ne(series.status, value);
        break;

      case 'date_added':
        if (operator === 'within_last') {
          const days = parseInt(value, 10);
          return gte(books.created_at, sql`NOW() - INTERVAL '${sql.raw(String(days))} days'`);
        }
        if (operator === 'before') return lt(books.created_at, new Date(value));
        if (operator === 'after') return gt(books.created_at, new Date(value));
        break;

      case 'year':
        if (operator === 'is') return eq(series.year, parseInt(value, 10));
        if (operator === 'before') return lt(series.year, parseInt(value, 10));
        if (operator === 'after') return gt(series.year, parseInt(value, 10));
        if (operator === 'between') {
          const [start, end] = value.split(',').map(Number);
          return and(gte(series.year, start), lte(series.year, end));
        }
        break;

      case 'decade': {
        const decadeStart = parseInt(value, 10);
        return and(gte(series.year, decadeStart), lt(series.year, decadeStart + 10));
      }

      case 'has_comicvine_id':
        if (operator === 'is_true') return isNotNull(series.cv_id);
        if (operator === 'is_false') return isNull(series.cv_id);
        break;

      case 'has_credits':
        if (operator === 'is_true') return isNotNull(books.credits);
        if (operator === 'is_false') return isNull(books.credits);
        break;

      case 'page_count':
        if (operator === 'greater_than') return gt(books.page_count, parseInt(value, 10));
        if (operator === 'less_than') return lt(books.page_count, parseInt(value, 10));
        if (operator === 'between') {
          const [min, max] = value.split(',').map(Number);
          return and(gte(books.page_count, min), lte(books.page_count, max));
        }
        break;

      case 'format': {
        const ext = `.${value}`;
        return like(books.file_path, `%${ext}`);
      }

      case 'story_arc':
        if (operator === 'contains') {
          return sql`${books.story_arcs}::text ILIKE ${'%' + value + '%'}`;
        }
        break;

      case 'author':
        if (operator === 'contains') {
          return or(
            like(books.authors, `%${value}%`),
            sql`${books.credits}::text ILIKE ${'%' + value + '%'}`
          );
        }
        break;

      case 'collection_membership': {
        const memberSubquery = db
          .select({ book_id: collectionItems.book_id })
          .from(collectionItems)
          .where(eq(collectionItems.collection_id, value));

        if (operator === 'in') return sql`${books.id} IN (${memberSubquery})`;
        if (operator === 'not_in') return sql`${books.id} NOT IN (${memberSubquery})`;
        break;
      }

      case 'file_size':
        if (operator === 'greater_than') return gt(books.file_size, parseInt(value, 10));
        if (operator === 'less_than') return lt(books.file_size, parseInt(value, 10));
        break;

      default:
        console.warn(`[RULES ENGINE] Unknown field: ${field}`);
        return undefined;
    }
  } catch (error) {
    console.warn(`[RULES ENGINE] Error building condition for ${field}:`, error);
    return undefined;
  }

  console.warn(`[RULES ENGINE] Unknown operator "${operator}" for field "${field}"`);
  return undefined;
}

/**
 * Build a complete WHERE clause from smart rules.
 * Fields referencing `series` require a join — the caller must ensure
 * the query includes `.innerJoin(series, eq(books.series_id, series.id))`.
 */
export function buildWhereClause(rules: SmartRules, userId: string): SQL | undefined {
  if (!rules.conditions || rules.conditions.length === 0) return undefined;

  const conditions = rules.conditions
    .map((c) => buildCondition(c, userId))
    .filter((c): c is SQL => c !== undefined);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return rules.match === 'all' ? and(...conditions) : or(...conditions);
}

/**
 * Get the sort expression for a collection.
 */
function getSortExpression(sortPreference?: string | null) {
  switch (sortPreference) {
    case 'title_asc': return sql`${books.title} ASC`;
    case 'title_desc': return sql`${books.title} DESC`;
    case 'date_added_asc': return sql`${books.created_at} ASC`;
    case 'date_added_desc': return sql`${books.created_at} DESC`;
    case 'issue_number_asc': return sql`${books.number} ASC`;
    case 'issue_number_desc': return sql`${books.number} DESC`;
    case 'year_asc': return sql`${series.year} ASC`;
    case 'year_desc': return sql`${series.year} DESC`;
    case 'publisher_asc': return sql`${books.publisher} ASC`;
    default: return sql`${books.created_at} DESC`;
  }
}

/**
 * Determines if any rule condition requires a join to the series table.
 */
function requiresSeriesJoin(rules: SmartRules): boolean {
  const seriesFields = new Set(['series_status', 'series_name', 'year', 'decade', 'has_comicvine_id']);
  return rules.conditions.some((c) => seriesFields.has(c.field));
}

/**
 * Get the count of books matching a smart collection's rules.
 * Cached for 30 seconds.
 */
export async function getSmartCollectionCount(
  rules: SmartRules,
  userId: string
): Promise<number> {
  const whereClause = buildWhereClause(rules, userId);
  if (!whereClause) return 0;

  const query = db.select({ count: count() }).from(books);

  // Always join series since many conditions use it
  const withJoin = query.innerJoin(series, eq(books.series_id, series.id));
  const [result] = await withJoin.where(whereClause);

  return result?.count ?? 0;
}

/**
 * Cached version of getSmartCollectionCount.
 */
export const getCachedSmartCollectionCount = unstable_cache(
  async (rulesJson: string, userId: string) => {
    const rules: SmartRules = JSON.parse(rulesJson);
    return getSmartCollectionCount(rules, userId);
  },
  ['smart-collection-count'],
  { revalidate: 30, tags: ['smart-collections-all'] }
);

/**
 * Get books matching a smart collection's rules.
 */
export async function getSmartCollectionBooks(
  rules: SmartRules,
  userId: string,
  sortPreference?: string | null,
  limit?: number,
  offset?: number
): Promise<typeof books.$inferSelect[]> {
  const whereClause = buildWhereClause(rules, userId);

  const query = db
    .select({
      id: books.id,
      series_id: books.series_id,
      file_path: books.file_path,
      file_size: books.file_size,
      title: books.title,
      number: books.number,
      page_count: books.page_count,
      summary: books.summary,
      publisher: books.publisher,
      authors: books.authors,
      published_date: books.published_date,
      metron_id: books.metron_id,
      credits: books.credits,
      story_arcs: books.story_arcs,
      created_at: books.created_at,
      updated_at: books.updated_at,
    })
    .from(books)
    .innerJoin(series, eq(books.series_id, series.id));

  const sorted = whereClause
    ? query.where(whereClause).orderBy(getSortExpression(sortPreference))
    : query.orderBy(getSortExpression(sortPreference));

  if (limit) {
    const limited = sorted.limit(limit);
    if (offset) return limited.offset(offset);
    return limited;
  }

  return sorted;
}

/**
 * Cached version of getSmartCollectionBooks.
 */
export const getCachedSmartCollectionBooks = unstable_cache(
  async (
    rulesJson: string,
    userId: string,
    sortPreference?: string | null,
    limit?: number,
    offset?: number
  ) => {
    const rules: SmartRules = JSON.parse(rulesJson);
    return getSmartCollectionBooks(rules, userId, sortPreference, limit, offset);
  },
  ['smart-collection-books'],
  { revalidate: 60, tags: ['smart-collections-all'] }
);

/**
 * Invalidate all smart collection caches.
 * Call this when reading progress changes, books are added/deleted, etc.
 */
export function invalidateSmartCollections() {
  revalidateTag('smart-collections-all');
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No type errors. The module is importable.

**Step 3: Commit**

```bash
git add src/lib/rules-engine.ts
git commit -m "feat: add rule engine — translates smart collection rules to Drizzle SQL queries"
```

---

### Task 8: Update Collections Server Actions

Extend the existing collections actions to support smart collections (create/update with rules, get with counts, preview).

**Files:**
- Modify: `src/actions/collections.ts`

**Step 1: Update createCollection to accept smart collection fields**

Update the function signature and insert logic:

```typescript
export async function createCollection(
  name: string,
  options?: {
    description?: string;
    smartRules?: SmartRules;
    pinned?: boolean;
    icon?: string;
    sortPreference?: string;
  }
): Promise<{ success: boolean; collection?: Collection; error?: string }>
```

Insert the new fields. Import `SmartRules` from `@/types/longbox`.

**Step 2: Update getCollections to include smart collection fields and counts**

For smart collections, the count comes from the rule engine, not from `collectionItems`. Update the `Collection` interface to include `smartRules`, `pinned`, `icon`, `sortPreference`, `isSmart`.

Use `getCachedSmartCollectionCount` for smart collections, `collectionItems` count for manual ones.

**Step 3: Update getCollection to handle smart collections**

If the collection has `smart_rules`, use `getCachedSmartCollectionBooks` to get the books instead of querying `collectionItems`.

**Step 4: Update updateCollection to accept smart collection fields**

Allow updating `smartRules`, `pinned`, `icon`, `sortPreference` via the `data` parameter.

**Step 5: Add getSmartCollectionPreview action**

New server action for the rule builder live preview:

```typescript
export async function getSmartCollectionPreview(
  rules: SmartRules,
  limit?: number
): Promise<{ count: number; books: { id: string; title: string }[] }>
```

This calls the uncached versions directly for real-time feedback.

**Step 6: Add getPinnedCollections action**

For the sidebar and mobile chips:

```typescript
export async function getPinnedCollections(): Promise<Collection[]>
```

Filters by `pinned = true`, includes count (smart or manual).

**Step 7: Add seedStarterCollections action**

Creates the 4 default smart collections if none exist yet:

```typescript
export async function seedStarterCollections(userId: string): Promise<void>
```

Creates: Unread (BookOpen, pinned), Recently Added (Clock, pinned), Needs Metadata (AlertTriangle), Ongoing Series (Flame).

**Step 8: Verify build and commit**

Run: `npm run build`

```bash
git add src/actions/collections.ts
git commit -m "feat: extend collection actions for smart collections — CRUD, preview, pinned, seeding"
```

---

### Task 9: Add Cache Invalidation to Reading Actions

When reading progress changes, smart collection caches should be invalidated.

**Files:**
- Modify: `src/actions/reading.ts:61-73,78-98`
- Modify: `src/lib/data/reading-progress.ts` (if invalidation is better placed here)

**Step 1: Add invalidation calls**

In `saveReadingProgress` and `toggleBookReadStatus`, call `invalidateSmartCollections()` after the database write:

```typescript
import { invalidateSmartCollections } from '@/lib/rules-engine';

// In saveReadingProgress, after updateReadingProgress():
invalidateSmartCollections();

// In toggleBookReadStatus, after markAsCompleted/resetReadingProgress:
invalidateSmartCollections();
```

**Step 2: Verify build and commit**

```bash
git add src/actions/reading.ts
git commit -m "feat: invalidate smart collection caches on reading progress changes"
```

---

### Task 10: Build the Rule Builder UI Components

The visual rule builder for creating/editing smart collections.

**Files:**
- Create: `src/components/longbox/rule-builder.tsx` (main form, client component)
- Create: `src/components/longbox/condition-row.tsx` (single condition row)
- Create: `src/components/longbox/icon-picker.tsx` (Lucide icon grid)
- Create: `src/components/longbox/collection-preview.tsx` (live count + covers)

**Step 1: Create field definitions constant**

In `src/lib/field-definitions.ts`, create the `FIELD_DEFINITIONS` array that maps each field to its label, group, operators, and value type. This drives the rule builder UI.

```typescript
import type { FieldDefinition } from '@/types/longbox';

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    field: 'publisher',
    label: 'Publisher',
    group: 'Metadata',
    operators: ['is', 'is_not', 'contains'],
    valueType: 'text',
  },
  {
    field: 'reading_status',
    label: 'Reading Status',
    group: 'Reading',
    operators: ['is', 'is_not'],
    valueType: 'enum',
    enumValues: [
      { label: 'Unread', value: 'unread' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' },
    ],
  },
  // ... all 15 fields from the design doc
];
```

**Step 2: Create `condition-row.tsx`**

Client component. Renders a single condition with:
- Field selector (combobox, grouped by Metadata/Reading/Library)
- Operator selector (dynamic, filtered by selected field)
- Value input (adapts based on field: text input, enum combobox, number input, date picker)
- Remove button (X)

Uses shadcn/ui Select, Input, and Combobox components.

**Step 3: Create `icon-picker.tsx`**

Client component. Grid of ~20 thematic Lucide icons:
BookOpen, Swords, Shield, Skull, Crown, Flame, Zap, Star, Heart, AlertTriangle, Clock, Eye, Bookmark, Archive, FolderOpen, Library, Layers, Grid, Filter, Hash.

Renders as a popover with a grid of icon buttons. Selected icon is highlighted.

**Step 4: Create `collection-preview.tsx`**

Client component. Shows:
- "N books match" text (updates via debounced server action call)
- Horizontal scroll strip of first 6 matching book covers
- Loading skeleton while fetching

Calls `getSmartCollectionPreview` action on rule changes (debounced 500ms).

**Step 5: Create `rule-builder.tsx`**

Client component. The main form containing:
- Name text input
- IconPicker
- Match mode toggle (All / Any)
- List of ConditionRow components
- "Add condition" button
- Sort preference selector
- CollectionPreview
- Pin to sidebar toggle
- Save button

State: `useState` for name, icon, match mode, conditions array, sort, pinned.
On save: calls `createCollection` or `updateCollection` server action.

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/lib/field-definitions.ts src/components/longbox/rule-builder.tsx src/components/longbox/condition-row.tsx src/components/longbox/icon-picker.tsx src/components/longbox/collection-preview.tsx
git commit -m "feat: add rule builder UI — visual condition builder with live preview"
```

---

### Task 11: Build the Collection Card Component

Card with 2x2 cover mosaic for the collections grid page.

**Files:**
- Create: `src/components/longbox/collection-card.tsx`

**Step 1: Create collection-card.tsx**

Server component (or client if interactivity needed). Renders:
- 2x2 grid of cover images (first 4 books, using `/api/cover/[bookId]`)
- Collection icon (dynamic Lucide icon from name string) + collection name
- Book count badge
- Smart collection indicator (Zap icon if `isSmart`)
- Pin indicator if pinned
- Link wrapper to `/collections/[id]`

For empty collections, show a placeholder with the collection icon centered.

Use the existing `grid-card.tsx` pattern as reference for styling.

**Step 2: Commit**

```bash
git add src/components/longbox/collection-card.tsx
git commit -m "feat: add collection card component with 2x2 cover mosaic"
```

---

### Task 12: Build the Collections Page

**Files:**
- Create: `src/app/(dashboard)/collections/page.tsx`
- Create: `src/app/(dashboard)/collections/loading.tsx`

**Step 1: Create the collections page**

Server component. Renders:
- Header: "Collections" title + "New" button (links to `/collections/new`)
- Pinned section (if any pinned collections): label + card grid
- All Collections section: card grid
- Empty state using `<EmptyState>` component

Calls `getCollections()` (updated in Task 8) which returns collections with counts.

**Step 2: Create loading skeleton**

`loading.tsx` with card grid skeleton matching the page layout.

**Step 3: Verify it renders**

Run: `npm run dev`, navigate to `/collections`.
Expected: Page renders with empty state (no collections yet).

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/collections/page.tsx src/app/\(dashboard\)/collections/loading.tsx
git commit -m "feat: add collections page with grid layout and empty state"
```

---

### Task 13: Build the Collection Create/Edit Pages

**Files:**
- Create: `src/app/(dashboard)/collections/new/page.tsx`
- Create: `src/app/(dashboard)/collections/[id]/page.tsx`
- Create: `src/app/(dashboard)/collections/[id]/edit/page.tsx`
- Create: `src/app/(dashboard)/collections/[id]/loading.tsx`

**Step 1: Create the "new collection" page**

Renders the `<RuleBuilder>` component in create mode. On save, redirects to `/collections/[id]`.

Also add a toggle/tab at the top to switch between "Smart Collection" and "Manual Collection" modes. Manual mode shows only name, icon, description.

**Step 2: Create the collection detail page**

Server component. Fetches the collection via `getCollection(id)`. Renders:
- Hero header with collection icon, name, description, book count
- "Edit Rules" button for smart collections
- Book grid (reuse existing grid pattern from library page)
- Uses the collection's `sort_preference` for ordering

**Step 3: Create the edit page**

Renders `<RuleBuilder>` in edit mode, pre-populated with the collection's current rules. On save, redirects back to `/collections/[id]`.

**Step 4: Create loading skeleton**

**Step 5: Verify the full flow**

Run: `npm run dev`
1. Navigate to `/collections`
2. Click "New"
3. Create a smart collection with publisher = DC Comics
4. Verify preview shows correct count
5. Save → redirected to collection detail
6. Click "Edit Rules" → edit page loads with rules pre-filled

**Step 6: Commit**

```bash
git add src/app/\(dashboard\)/collections/
git commit -m "feat: add collection create, detail, and edit pages"
```

---

### Task 14: Sidebar Integration — Pinned Collections

**Files:**
- Modify: `src/components/longbox/sidebar.tsx:1-117`
- Create: `src/components/longbox/pinned-collections-sidebar.tsx`

**Step 1: Create pinned-collections-sidebar.tsx**

This is tricky because the sidebar is a client component but we need to fetch pinned collections. Options:
1. Make it a client component that fetches via a server action on mount
2. Pass pinned collections as props from a parent server component

Since the sidebar is rendered in the dashboard layout (which is a server component), pass the data down.

Create `pinned-collections-sidebar.tsx` as a client component that receives `collections` as a prop. Renders:
- "Collections" section label
- List of pinned collections with dynamic Lucide icon + name
- "All" link at the bottom → `/collections`

Use dynamic import for Lucide icons: `import { icons } from 'lucide-react'` and access `icons[iconName]`.

**Step 2: Update sidebar.tsx**

Add the `PinnedCollectionsSidebar` component below the nav links, above the user menu. Since sidebar is a client component, it needs to receive pinned collections as a prop (or fetch them client-side).

Simplest approach: add a `useEffect` + server action call to `getPinnedCollections()` on mount.

**Step 3: Verify sidebar shows pinned collections**

Create a pinned collection, verify it appears in the sidebar.

**Step 4: Commit**

```bash
git add src/components/longbox/sidebar.tsx src/components/longbox/pinned-collections-sidebar.tsx
git commit -m "feat: show pinned collections in sidebar"
```

---

### Task 15: Mobile Dashboard — Pinned Collection Chips

**Files:**
- Create: `src/components/longbox/pinned-collections-chips.tsx`
- Modify: `src/app/(dashboard)/page.tsx:1-51`

**Step 1: Create pinned-collections-chips.tsx**

Client component. Horizontal scrolling chip row. Each chip shows collection name + count. Tapping navigates to `/collections/[id]`.

Styled with the muted dark green theme: `rgba(160,180,145,0.15)` background, `#c0c8b8` text.

**Step 2: Update dashboard page**

Add `<PinnedCollectionsChips />` as the first element in the dashboard, above `<ContinueReading>`:

```tsx
<Suspense fallback={<div className="h-10" />}>
  <PinnedCollectionsChips />
</Suspense>
```

**Step 3: Verify on mobile viewport**

Open dev tools, set mobile viewport. Verify chips scroll horizontally.

**Step 4: Commit**

```bash
git add src/components/longbox/pinned-collections-chips.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat: add pinned collection chips to mobile dashboard"
```

---

### Task 16: Add Collections Link to Sidebar Navigation

**Files:**
- Modify: `src/components/longbox/sidebar.tsx:17-66` (ROUTES array)

**Step 1: Add Collections route**

Add to the ROUTES array, after Library:

```typescript
{
  label: 'Collections',
  icon: Layers,
  href: '/collections',
  matchExact: false,
  disabled: false,
},
```

Import `Layers` from `lucide-react`.

**Step 2: Commit**

```bash
git add src/components/longbox/sidebar.tsx
git commit -m "feat: add Collections nav link to sidebar"
```

---

### Task 17: Seed Starter Collections

**Files:**
- Modify: `src/app/(dashboard)/page.tsx` (or `src/app/(dashboard)/layout.tsx`)

**Step 1: Trigger seeding**

In the dashboard layout or page, call `seedStarterCollections(userId)` on first load. This is idempotent — only creates if no collections exist for the user.

```typescript
// In dashboard page.tsx (server component)
import { seedStarterCollections } from '@/actions/collections';
import { auth } from '@/lib/auth';

// At the top of the component:
const session = await auth();
if (session?.user?.id) {
  await seedStarterCollections(session.user.id);
}
```

**Step 2: Verify starter collections appear**

Run: `npm run dev`, open the dashboard. Verify:
- 4 collections appear in `/collections`
- "Unread" and "Recently Added" appear in sidebar (pinned)
- Mobile chips show the pinned collections

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: seed 4 starter smart collections on first dashboard visit"
```

---

### Task 18: Final Build Verification & Cleanup

**Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Lint**

Run: `npm run lint`
Fix any lint issues.

**Step 3: Manual test checklist**

- [ ] `/collections` page loads with starter collections
- [ ] Clicking "New" opens rule builder
- [ ] Can create a smart collection with any field/operator combination
- [ ] Live preview shows correct count
- [ ] Saving redirects to collection detail page
- [ ] Collection detail shows books matching the rules
- [ ] Editing rules works (pre-populated, saves changes)
- [ ] Pinned collections appear in desktop sidebar
- [ ] Pinned collections appear as mobile chips on dashboard
- [ ] Manual collections still work (create, add books, remove)
- [ ] Deleting a collection works
- [ ] Reading progress changes invalidate smart collection counts
- [ ] Requests page still works after schema consolidation

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and lint fixes for smart collections feature"
```
